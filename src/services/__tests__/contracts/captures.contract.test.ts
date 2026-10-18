/** Contrato de CapturesService (Fase 2): roda igual no fake e sobre os serviços reais. */
import { isDomainError } from '@/domain/errors';

import { environments, NUBANK_PACKAGE, TODAY } from './setup';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

/** Depois de qualquer captura dos dados de exemplo. */
const FUTURE = Date.UTC(2100, 0, 1);

describe.each(environments)('CapturesService ($name)', ({ create }) => {
  it('ingest grava cada notificação uma vez e tira da fila do módulo', async () => {
    const { services, notifications } = await create();
    const before = await services.captures.countPending();
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Nubank', text: 'Compra de R$ 9,90' });

    expect(await services.captures.ingest()).toBe(1);
    expect(await services.captures.ingest()).toBe(0);
    expect(await notifications.getPending(10)).toEqual([]);
    expect(await services.captures.countPending()).toBe(before + 1);
  });

  it('listRecent traz todas as situações, da mais recente, com limite', async () => {
    const { services, notifications } = await create();
    notifications.post({ packageName: NUBANK_PACKAGE, text: 'Primeira', postedAtMs: FUTURE + 1 });
    notifications.post({ packageName: NUBANK_PACKAGE, text: 'Segunda', postedAtMs: FUTURE + 2 });
    notifications.post({ packageName: NUBANK_PACKAGE, text: 'Terceira', postedAtMs: FUTURE + 3 });
    await services.captures.ingest();
    const [third] = await services.captures.listRecent(1);
    expect(third.text).toBe('Terceira');
    await services.captures.discardCapture(third.id);

    const recent = await services.captures.listRecent(2);
    expect(recent.map((c) => c.text)).toEqual(['Terceira', 'Segunda']);
    expect(recent[0].status).toBe('discarded');
  });

  it('duas leituras ao mesmo tempo não duplicam capturas', async () => {
    const { services, notifications } = await create();
    const before = await services.captures.countPending();
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'A', text: 'a' });
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'B', text: 'b' });

    await Promise.all([services.captures.ingest(), services.captures.ingest()]);
    expect(await services.captures.countPending()).toBe(before + 2);
  });

  it('sem parser, entra como não interpretada, com o texto guardado', async () => {
    const { services, notifications } = await create();
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Nubank', text: 'Algo novo' });
    await services.captures.ingest();

    const [latest] = await services.captures.listPending();
    expect(latest).toMatchObject({
      text: 'Algo novo',
      parser: null,
      amountCents: null,
      status: 'pending',
    });
  });

  it('confirmar com os dados cria o lançamento de notificação e aprende a origem', async () => {
    const { services, notifications, seed } = await create();
    const account = seed.accounts[0];
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Pix recebido', text: 'R$ 150,00' });
    await services.captures.ingest();
    const [capture] = await services.captures.listPending();

    const [tx] = await services.captures.confirmCapture(capture.id, {
      kind: 'income',
      amountCents: 15000,
      date: TODAY,
      accountId: account.id,
    });

    expect(tx).toMatchObject({ kind: 'income', amountCents: 15000, source: 'notification' });
    expect(await services.transactions.getTransaction(tx.id)).toBeDefined();
    expect(await services.captures.getCapture(capture.id)).toMatchObject({
      status: 'confirmed',
      transactionId: tx.id,
    });

    // A próxima notificação do mesmo app já chega com a conta sugerida.
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Pix recebido', text: 'R$ 20,00' });
    await services.captures.ingest();
    const [next] = await services.captures.listPending();
    expect(next.suggestedAccountId).toBe(account.id);
  });

  it('compra no cartão confirmada vira parcelas na fatura', async () => {
    const { services, notifications, seed } = await create();
    const card = seed.creditCards[0];
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Compra', text: 'R$ 300,00' });
    await services.captures.ingest();
    const [capture] = await services.captures.listPending();

    const created = await services.captures.confirmCapture(capture.id, {
      kind: 'card_purchase',
      amountCents: 30000,
      date: TODAY,
      cardId: card.id,
      installments: 3,
    });

    expect(created).toHaveLength(3);
    expect(created.every((t) => t.source === 'notification' && t.cardId === card.id)).toBe(true);
  });

  it('confirmar sem valor ou origem é recusado e a captura continua pendente', async () => {
    const { services, notifications } = await create();
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Nubank', text: 'Algo novo' });
    await services.captures.ingest();
    const [capture] = await services.captures.listPending();

    const error = await services.captures.confirmCapture(capture.id).catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('capture_incomplete');
    expect((await services.captures.getCapture(capture.id))?.status).toBe('pending');
  });

  it('confirmMany separa as completas das incompletas', async () => {
    const { services, notifications, seed } = await create();
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'A', text: 'a' });
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'B', text: 'b' });
    await services.captures.ingest();
    const [b, a] = await services.captures.listPending();
    await services.captures.confirmCapture(a.id, {
      kind: 'expense',
      amountCents: 100,
      date: TODAY,
      accountId: seed.accounts[0].id,
    });

    // `b` não tem valor: fica.
    const result = await services.captures.confirmMany([b.id]);
    expect(result).toEqual({ confirmed: [], skipped: [b.id] });
  });

  it('descartar tira da caixa; restaurar devolve', async () => {
    const { services, notifications } = await create();
    notifications.post({ packageName: NUBANK_PACKAGE, title: 'Nubank', text: 'x' });
    await services.captures.ingest();
    const [capture] = await services.captures.listPending();
    const before = await services.captures.countPending();

    await services.captures.discardCapture(capture.id);
    expect(await services.captures.countPending()).toBe(before - 1);

    await services.captures.restoreCapture(capture.id);
    expect(await services.captures.countPending()).toBe(before);
  });
});
