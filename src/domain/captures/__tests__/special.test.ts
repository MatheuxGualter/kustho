import type { Capture, Transaction } from '@/domain/types';

import { captureExtrasDefaults } from '../rules';
import { findDuplicate, findRefundTarget, REFUND_MAX_DAYS } from '../special';

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
  suggestedAccountId: null,
  suggestedCardId: null,
  confidence: 0.7,
  status: 'pending',
  transactionId: null,
  ...captureExtrasDefaults,
  ...fields,
});

let seq = 0;
const purchase = (fields: Partial<Transaction> = {}): Transaction => ({
  id: `tx${++seq}`,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  kind: 'card_purchase',
  amountCents: 12000,
  direction: null,
  date: '2026-10-10',
  description: 'Loja de Tênis',
  categoryId: null,
  accountId: null,
  cardId: 'card-nu',
  invoiceId: 'inv',
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

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 18, 15, minutes)).toISOString();

describe('findDuplicate', () => {
  const incoming = capture({ rawId: 'sms', packageName: 'com.google.android.apps.messaging' });

  it('mesmo valor e tipo de outra fonte em até 5 minutos é duplicata', () => {
    const push = capture({ id: 'push', postedAt: at(3) });
    expect(findDuplicate({ ...incoming, postedAt: at(0) }, [push])?.id).toBe('push');
  });

  it('mais de 5 minutos, outro valor, outro tipo ou a mesma fonte não são duplicata', () => {
    const base = { ...incoming, postedAt: at(0) };
    expect(findDuplicate(base, [capture({ postedAt: at(6) })])).toBeNull();
    expect(findDuplicate(base, [capture({ postedAt: at(1), amountCents: 4591 })])).toBeNull();
    expect(findDuplicate(base, [capture({ postedAt: at(1), kind: 'income' })])).toBeNull();
    // Dois cafés iguais no mesmo app são duas compras.
    expect(
      findDuplicate(base, [capture({ postedAt: at(1), packageName: incoming.packageName })]),
    ).toBeNull();
  });

  it('comprovante aceita até 60 minutos da notificação', () => {
    const receipt = { ...incoming, channel: 'receipt' as const, postedAt: at(50) };
    expect(findDuplicate(receipt, [capture({ id: 'push', postedAt: at(0) })])?.id).toBe('push');
    expect(
      findDuplicate({ ...receipt, postedAt: at(61) }, [capture({ postedAt: at(0) })]),
    ).toBeNull();
  });

  describe('comprovante contra comprovante', () => {
    const receipt = (fields: Partial<Capture>) =>
      capture({ packageName: 'kustho.comprovante', channel: 'receipt', ...fields });

    it('o mesmo Pix compartilhado de novo (imagem e PDF) é duplicata', () => {
      const first = receipt({ id: 'first', rawId: 'receipt:0a1b2c3d', postedAt: at(0) });
      const again = receipt({ rawId: 'receipt:4e5f6a7b', postedAt: at(4) });
      expect(findDuplicate(again, [first])?.id).toBe('first');
    });

    it('IDs de Pix diferentes são dois Pix, mesmo com valor igual', () => {
      const first = receipt({ rawId: 'receipt:pix:E00000000202610181500AAAAAAAAAAA' });
      const second = receipt({ rawId: 'receipt:pix:E00000000202610181503BBBBBBBBBBB' });
      expect(findDuplicate(second, [first])).toBeNull();
    });

    it('um com ID e outro sem: decide pelo valor e pela janela', () => {
      const first = receipt({ id: 'first', rawId: 'receipt:0a1b2c3d', postedAt: at(0) });
      const withId = receipt({ rawId: 'receipt:pix:E00000000202610181500AAAAAAAAAAA' });
      expect(findDuplicate({ ...withId, postedAt: at(30) }, [first])?.id).toBe('first');
      expect(findDuplicate({ ...withId, postedAt: at(61) }, [first])).toBeNull();
    });
  });

  it('ignora descartadas, excluídas, duplicatas e a própria notificação', () => {
    const base = { ...incoming, postedAt: at(0) };
    expect(findDuplicate(base, [capture({ status: 'discarded' })])).toBeNull();
    expect(findDuplicate(base, [capture({ deletedAt: at(0) })])).toBeNull();
    expect(findDuplicate(base, [capture({ duplicateOfId: 'x' })])).toBeNull();
    expect(
      findDuplicate(base, [capture({ rawId: 'sms', packageName: 'other', postedAt: at(0) })]),
    ).toBeNull();
  });

  it('confirmada também conta (a transação já virou lançamento)', () => {
    const confirmed = capture({ id: 'c', status: 'confirmed', postedAt: at(2) });
    expect(findDuplicate({ ...incoming, postedAt: at(0) }, [confirmed])?.id).toBe('c');
  });

  it('não interpretada nunca é duplicata', () => {
    expect(findDuplicate({ ...incoming, amountCents: null }, [capture()])).toBeNull();
  });

  it('a mais próxima no tempo ganha', () => {
    const far = capture({ id: 'far', postedAt: at(4) });
    const near = capture({ id: 'near', postedAt: at(1) });
    expect(findDuplicate({ ...incoming, postedAt: at(0) }, [far, near])?.id).toBe('near');
  });
});

describe('findRefundTarget', () => {
  const refund = capture({
    kind: 'card_refund',
    amountCents: 12000,
    merchant: 'LOJA DE TENIS',
    date: '2026-10-18',
    suggestedCardId: 'card-nu',
  });
  const option = (tx: Transaction, refundableCents = tx.amountCents) => ({ tx, refundableCents });

  it('acha a compra do mesmo estabelecimento no mesmo cartão', () => {
    const target = purchase();
    const decision = findRefundTarget(refund, [
      option(purchase({ description: 'Mercado' })),
      option(target),
    ]);
    expect(decision).toMatchObject({ action: 'link', transactionId: target.id });
  });

  it('estorno parcial cabe no que ainda pode ser estornado', () => {
    const target = purchase({ amountCents: 30000 });
    expect(findRefundTarget(refund, [option(target, 12000)])).toMatchObject({ action: 'link' });
    expect(findRefundTarget(refund, [option(target, 11999)]).action).toBe('create');
  });

  it('ignora outro cartão, compra depois do estorno, antiga demais e o que não é compra', () => {
    const list = [
      option(purchase({ cardId: 'card-itau' })),
      option(purchase({ date: '2026-10-19' })),
      option(purchase({ date: '2026-06-01' })),
      option(purchase({ kind: 'expense', cardId: null, accountId: 'acc' })),
      option(purchase({ deletedAt: '2026-10-11T00:00:00.000Z' })),
    ];
    expect(findRefundTarget(refund, list).action).toBe('create');
    expect(REFUND_MAX_DAYS).toBeGreaterThanOrEqual(90);
  });

  it('sem estabelecimento parecido, só o valor exato aponta a compra', () => {
    const other = { ...refund, merchant: 'ESTORNO' };
    expect(findRefundTarget(other, [option(purchase({ description: 'Mercado' }))])).toMatchObject({
      action: 'link',
    });
    expect(
      findRefundTarget(other, [option(purchase({ description: 'Mercado', amountCents: 50000 }))])
        .action,
    ).toBe('create');
  });

  it('empate fica com a compra mais recente', () => {
    const old = purchase({ date: '2026-10-01' });
    const recent = purchase({ date: '2026-10-15' });
    expect(findRefundTarget(refund, [option(old), option(recent)])).toMatchObject({
      transactionId: recent.id,
    });
  });

  it('sem cartão sugerido, procura em todos', () => {
    const target = purchase({ cardId: 'card-itau' });
    expect(findRefundTarget({ ...refund, suggestedCardId: null }, [option(target)])).toMatchObject({
      transactionId: target.id,
    });
  });
});
