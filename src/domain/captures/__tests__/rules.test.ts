import type { RawNotification } from '../../../../modules/notification-capture/src/NotificationCapture.types';
import type { NotificationParser } from '@/domain/contracts';
import type { Capture, CaptureOriginRule } from '@/domain/types';

import {
  captureExtrasDefaults,
  buildCapture,
  learnedRule,
  parseNotification,
  resolveConfirmation,
  suggestOrigin,
} from '../rules';

const NUBANK = 'com.nu.production';

const raw = (fields: Partial<RawNotification> = {}): RawNotification => ({
  id: 'raw-1',
  key: 'k',
  packageName: NUBANK,
  title: 'Compra aprovada',
  text: 'Compra de R$ 45,90 em PADARIA',
  // 18/10/2026 15:00 no horário de Brasília (UTC−3).
  postedAtMs: Date.UTC(2026, 9, 18, 18, 0),
  capturedAtMs: Date.UTC(2026, 9, 18, 18, 0),
  ...fields,
});

const parser = (id: string, packages: string[], amountCents = 4590): NotificationParser => ({
  id,
  packages,
  parse: () => ({
    amountCents,
    kind: 'card_purchase',
    merchant: 'PADARIA',
    date: '2026-10-18',
    cardLastDigits: '1234',
    confidence: 0.9,
  }),
});

const rule = (fields: Partial<CaptureOriginRule>): CaptureOriginRule => ({
  id: 'r',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  packageName: NUBANK,
  cardLastDigits: null,
  accountId: null,
  cardId: null,
  ...fields,
});

const capture = (fields: Partial<Capture> = {}): Capture => ({
  id: 'c',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  rawId: 'raw-1',
  packageName: NUBANK,
  title: null,
  text: null,
  postedAt: '2026-10-18T18:00:00.000Z',
  parser: 'nubank',
  amountCents: 4590,
  kind: 'card_purchase',
  merchant: 'PADARIA',
  date: '2026-10-18',
  cardLastDigits: '1234',
  suggestedAccountId: null,
  suggestedCardId: 'card-1',
  confidence: 0.9,
  status: 'pending',
  transactionId: null,
  ...captureExtrasDefaults,
  ...fields,
});

describe('parseNotification', () => {
  it('usa o parser do pacote antes do genérico', () => {
    const result = parseNotification(
      [parser('generic', [], 100), parser('nubank', [NUBANK])],
      raw(),
    );
    expect(result?.parser).toBe('nubank');
  });

  it('cai no genérico quando o do pacote não reconhece', () => {
    const silent: NotificationParser = { id: 'nubank', packages: [NUBANK], parse: () => null };
    expect(parseNotification([silent, parser('generic', [])], raw())?.parser).toBe('generic');
  });

  it('devolve null quando nenhum reconhece', () => {
    expect(parseNotification([parser('itau', ['com.itau'])], raw())).toBeNull();
  });
});

describe('suggestOrigin', () => {
  it('prefere a regra do mesmo final de cartão; senão a do app', () => {
    const rules = [
      rule({ cardLastDigits: null, accountId: 'acc-1' }),
      rule({ cardLastDigits: '1234', cardId: 'card-1' }),
    ];
    expect(suggestOrigin(rules, NUBANK, '1234')).toEqual({ accountId: null, cardId: 'card-1' });
    expect(suggestOrigin(rules, NUBANK, '9999')).toEqual({ accountId: 'acc-1', cardId: null });
    expect(suggestOrigin(rules, 'com.itau', null)).toEqual({ accountId: null, cardId: null });
  });

  it('ignora regras excluídas', () => {
    const rules = [rule({ accountId: 'acc-1', deletedAt: '2026-10-18T00:00:00.000Z' })];
    expect(suggestOrigin(rules, NUBANK, null)).toEqual({ accountId: null, cardId: null });
  });
});

describe('buildCapture', () => {
  it('não interpretada: guarda o texto, sem valor e com confiança 0', () => {
    const built = buildCapture(raw(), null, []);
    expect(built).toMatchObject({
      rawId: 'raw-1',
      text: 'Compra de R$ 45,90 em PADARIA',
      parser: null,
      amountCents: null,
      kind: null,
      confidence: 0,
      status: 'pending',
      postedAt: '2026-10-18T18:00:00.000Z',
    });
  });

  it('não interpretada também recebe a origem aprendida do app', () => {
    const built = buildCapture(raw(), null, [rule({ accountId: 'acc-1' })]);
    expect(built.suggestedAccountId).toBe('acc-1');
  });

  it('interpretada: traz a sugestão e a origem aprendida', () => {
    const parsed = parseNotification([parser('nubank', [NUBANK])], raw());
    const built = buildCapture(raw(), parsed, [rule({ cardLastDigits: '1234', cardId: 'card-1' })]);
    expect(built).toMatchObject({
      parser: 'nubank',
      amountCents: 4590,
      kind: 'card_purchase',
      merchant: 'PADARIA',
      suggestedCardId: 'card-1',
      suggestedAccountId: null,
    });
  });
});

describe('resolveConfirmation', () => {
  it('completa com a sugestão', () => {
    expect(resolveConfirmation(capture(), {})).toEqual({
      kind: 'card_purchase',
      amountCents: 4590,
      date: '2026-10-18',
      description: 'PADARIA',
      categoryId: null,
      cardId: 'card-1',
      installments: 1,
    });
  });

  it('o que o usuário informa vence a sugestão', () => {
    const result = resolveConfirmation(capture(), {
      kind: 'expense',
      accountId: 'acc-1',
      description: 'Pão',
    });
    expect(result).toMatchObject({ kind: 'expense', accountId: 'acc-1', description: 'Pão' });
    expect(result).not.toHaveProperty('cardId');
  });

  it('incompleta sem valor, sem tipo ou sem a origem certa para o tipo', () => {
    expect(resolveConfirmation(capture({ amountCents: null }), {})).toBeNull();
    expect(resolveConfirmation(capture({ kind: null }), {})).toBeNull();
    expect(resolveConfirmation(capture({ suggestedCardId: null }), {})).toBeNull();
    // Despesa precisa de conta, não de cartão.
    expect(resolveConfirmation(capture(), { kind: 'expense' })).toBeNull();
  });

  it('estorno precisa da compra: a que o matcher achou ou a informada', () => {
    const refund = capture({ kind: 'card_refund', matchTransactionId: 'buy-1' });
    expect(resolveConfirmation(refund, {})).toMatchObject({
      kind: 'card_refund',
      refundOfId: 'buy-1',
    });
    expect(resolveConfirmation(refund, { refundOfId: 'buy-2' })).toMatchObject({
      refundOfId: 'buy-2',
    });
    expect(resolveConfirmation({ ...refund, matchTransactionId: null }, {})).toBeNull();
  });

  it('compra parcelada usa as parcelas lidas da notificação', () => {
    expect(resolveConfirmation(capture({ installments: 3 }), {})).toMatchObject({
      installments: 3,
    });
  });

  it('sem estabelecimento, a descrição vem do título', () => {
    const result = resolveConfirmation(capture({ merchant: null, title: 'Pix enviado' }), {});
    expect(result?.description).toBe('Pix enviado');
  });
});

describe('learnedRule', () => {
  it('lembra app + final do cartão → origem confirmada', () => {
    const confirmation = resolveConfirmation(capture(), {})!;
    expect(learnedRule(capture(), confirmation)).toEqual({
      packageName: NUBANK,
      cardLastDigits: '1234',
      accountId: null,
      cardId: 'card-1',
    });
  });
});
