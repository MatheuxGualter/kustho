/** Contrato de TransactionsService: roda igual no fake e no serviço real. */
import { isDomainError } from '@/domain/errors';

import { environments, TODAY } from './setup';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

describe.each(environments)('TransactionsService ($name)', ({ create }) => {
  it('agrupa o mês por dia, do mais recente ao mais antigo', async () => {
    const { services } = await create();
    const groups = await services.transactions.listMonthTransactions('2026-09');
    expect(groups.length).toBeGreaterThan(5);
    const dates = groups.map((g) => g.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(dates.every((d) => d.startsWith('2026-09'))).toBe(true);
  });

  it('cria despesa e ela aparece no dia, com o líquido certo', async () => {
    const { services, seed } = await create();
    const account = seed.accounts[0];
    const created = await services.transactions.createTransaction({
      kind: 'expense',
      amountCents: 4590,
      date: '2026-10-30',
      description: 'Almoço especial',
      categoryId: null,
      accountId: account.id,
    });
    expect(created).toMatchObject({ status: 'posted', source: 'manual', direction: null });
    const [day] = await services.transactions.listMonthTransactions('2026-10', {
      search: 'almoco especial',
    });
    expect(day.date).toBe('2026-10-30');
    expect(day.transactions.map((t) => t.id)).toEqual([created.id]);
    expect(day.netCents).toBe(-4590);
  });

  it('filtra por conta e por tipo', async () => {
    const { services, seed } = await create();
    const wallet = seed.accounts.find((a) => a.name === 'Carteira')!;
    const days = await services.transactions.listMonthTransactions('2026-09', {
      accountIds: [wallet.id],
      kinds: ['expense'],
    });
    const all = days.flatMap((d) => d.transactions);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((t) => t.accountId === wallet.id && t.kind === 'expense')).toBe(true);
  });

  it('excluir parcela leva o grupo e desfazer restaura tudo', async () => {
    const { services, seed } = await create();
    const installment = seed.transactions.find((t) => t.installmentGroupId)!;
    const ids = await services.transactions.deleteTransaction(installment.id);
    expect(ids).toHaveLength(installment.installmentTotal!);
    expect(await services.transactions.getTransaction(installment.id)).toBeUndefined();
    await services.transactions.restoreTransactions(ids);
    expect(await services.transactions.getTransaction(installment.id)).toBeDefined();
  });

  it('excluir uma perna da transferência leva a outra', async () => {
    const { services, seed } = await create();
    const leg = seed.transactions.find((t) => t.kind === 'transfer')!;
    const ids = await services.transactions.deleteTransaction(leg.id);
    expect(ids.sort()).toEqual([leg.id, leg.transferPeerId!].sort());
    expect(await services.transactions.getTransaction(leg.transferPeerId!)).toBeUndefined();
  });

  it('editar valor de uma perna da transferência ajusta a outra', async () => {
    const { services, seed } = await create();
    const leg = seed.transactions.find((t) => t.kind === 'transfer')!;
    await services.transactions.updateTransaction(leg.id, { amountCents: 33333 });
    expect((await services.transactions.getTransaction(leg.transferPeerId!))?.amountCents).toBe(
      33333,
    );
  });

  it('resumo do mês: receitas − despesas, previsto inclui agendados', async () => {
    const { services } = await create();
    const summary = await services.transactions.getMonthSummary('2026-09');
    expect(summary.incomeCents).toBe(650000 + 180000);
    expect(summary.netCents).toBe(summary.incomeCents - summary.expenseCents);
    const next = await services.transactions.getMonthSummary('2026-11');
    expect(next.projectedNetCents).toBeLessThan(next.netCents);
  });

  it('agendado vencido aparece para confirmar e some depois de confirmado', async () => {
    const { services, seed } = await create();
    const scheduled = seed.transactions.find((t) => t.status === 'scheduled')!;
    expect(await services.transactions.listDueScheduled(TODAY)).toEqual([]);
    const due = await services.transactions.listDueScheduled(scheduled.date);
    expect(due.map((t) => t.id)).toEqual([scheduled.id]);
    await services.transactions.confirmScheduled(scheduled.id);
    expect(await services.transactions.listDueScheduled(scheduled.date)).toEqual([]);
  });

  it('últimos lançamentos efetivados, do mais recente ao mais antigo', async () => {
    const { services } = await create();
    const recent = await services.transactions.listRecentTransactions(5);
    expect(recent).toHaveLength(5);
    expect(recent.every((t) => t.status === 'posted')).toBe(true);
    const dates = recent.map((t) => t.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('valor zero é recusado', async () => {
    const { services, seed } = await create();
    const error = await services.transactions
      .createTransaction({
        kind: 'expense',
        amountCents: 0,
        date: TODAY,
        description: 'x',
        categoryId: null,
        accountId: seed.accounts[0].id,
      })
      .catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('invalid_amount');
  });
});
