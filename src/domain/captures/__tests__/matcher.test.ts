import type { Capture, Transaction } from '@/domain/types';

import { decideMatch, findCandidates, LINK_THRESHOLD, scoreMatch } from '../matcher';
import { captureExtrasDefaults } from '../rules';

const capture = (fields: Partial<Capture> = {}): Capture => ({
  id: 'cap',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  rawId: 'raw',
  packageName: 'com.nu.production',
  title: null,
  text: null,
  postedAt: '2026-10-18T15:00:00.000Z',
  parser: 'generic',
  amountCents: 4590,
  kind: 'expense',
  merchant: 'PADARIA DO ZE',
  date: '2026-10-18',
  cardLastDigits: null,
  suggestedAccountId: 'acc-nu',
  suggestedCardId: null,
  confidence: 0.7,
  status: 'pending',
  transactionId: null,
  ...captureExtrasDefaults,
  ...fields,
});

let seq = 0;
const tx = (fields: Partial<Transaction> = {}): Transaction => ({
  id: `tx${++seq}`,
  createdAt: `2026-10-18T10:00:0${seq % 10}.000Z`,
  updatedAt: '',
  deletedAt: null,
  kind: 'expense',
  amountCents: 4590,
  direction: null,
  date: '2026-10-18',
  description: 'Padaria',
  categoryId: null,
  accountId: 'acc-nu',
  cardId: null,
  invoiceId: null,
  transferPeerId: null,
  installmentGroupId: null,
  refundOfId: null,
  installmentNumber: null,
  installmentTotal: null,
  status: 'posted',
  source: 'manual',
  notes: null,
  ...fields,
});

describe('findCandidates', () => {
  it('só lançamentos do mesmo valor e tipo, até 2 dias e ainda não conciliados', () => {
    const same = tx();
    const list = [
      same,
      tx({ amountCents: 4591 }),
      tx({ kind: 'income' }),
      tx({ date: '2026-10-21' }),
      tx({ date: '2026-10-16' }),
      tx({ deletedAt: 'x' }),
    ];
    const linked = tx();
    const found = findCandidates(capture(), [...list, linked], new Set([linked.id]));
    expect(found.map((t) => t.id)).toEqual([same.id, list[4].id]);
  });

  it('com origem sugerida, exige a mesma conta ou cartão', () => {
    const other = tx({ accountId: 'acc-inter' });
    expect(findCandidates(capture(), [other], new Set())).toEqual([]);
    expect(findCandidates(capture({ suggestedAccountId: null }), [other], new Set())).toHaveLength(
      1,
    );
  });

  it('compra no cartão casa com compra no mesmo cartão', () => {
    const purchase = tx({ kind: 'card_purchase', accountId: null, cardId: 'card-nu' });
    const cap = capture({
      kind: 'card_purchase',
      suggestedAccountId: null,
      suggestedCardId: 'card-nu',
    });
    expect(findCandidates(cap, [purchase], new Set())).toEqual([purchase]);
  });

  it('sem valor (não interpretada) não procura nada', () => {
    expect(findCandidates(capture({ amountCents: null }), [tx()], new Set())).toEqual([]);
  });
});

describe('scoreMatch', () => {
  it('mesmo dia, mesma origem e descrição parecida passa do limiar', () => {
    expect(scoreMatch(capture(), tx())).toBeGreaterThanOrEqual(LINK_THRESHOLD);
  });

  it('cada dia de distância tira pontos', () => {
    const sameDay = scoreMatch(capture(), tx());
    const twoDays = scoreMatch(capture(), tx({ date: '2026-10-16' }));
    expect(twoDays).toBeLessThan(sameDay);
  });

  it('descrição diferente pontua menos que parecida', () => {
    expect(scoreMatch(capture(), tx({ description: 'Uber' }))).toBeLessThan(
      scoreMatch(capture(), tx()),
    );
  });

  it('fica entre 0 e 1', () => {
    const s = scoreMatch(
      capture({ suggestedAccountId: null, merchant: null }),
      tx({ date: '2026-10-20' }),
    );
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe('decideMatch', () => {
  it('lançamento manual já existente: vincular', () => {
    const manual = tx();
    expect(decideMatch(capture(), [manual], new Set())).toMatchObject({
      action: 'link',
      transactionId: manual.id,
    });
  });

  it('sem candidato: criar', () => {
    expect(decideMatch(capture(), [tx({ amountCents: 1 })], new Set())).toEqual({
      action: 'create',
      score: 0,
    });
  });

  it('candidato fraco (descrição diferente e 2 dias): criar', () => {
    const weak = tx({ description: 'Mercado', date: '2026-10-16' });
    expect(decideMatch(capture(), [weak], new Set()).action).toBe('create');
  });

  it('dois gastos iguais no mesmo dia: cada captura vincula a um', () => {
    const first = tx({ createdAt: '2026-10-18T09:00:00.000Z' });
    const second = tx({ createdAt: '2026-10-18T12:00:00.000Z' });
    const linked = new Set<string>();
    const a = decideMatch(capture({ id: 'a' }), [second, first], linked);
    expect(a).toMatchObject({ action: 'link', transactionId: first.id });
    linked.add(first.id);
    const b = decideMatch(capture({ id: 'b' }), [second, first], linked);
    expect(b).toMatchObject({ action: 'link', transactionId: second.id });
  });
});
