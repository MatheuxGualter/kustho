import type { Transaction } from '@/domain/types';

import { groupByDay, matchesFilters, monthSummary, periodSummary, relatedIds } from '../rules';

let seq = 0;
const tx = (fields: Partial<Transaction>): Transaction => ({
  id: `t${seq++}`,
  createdAt: `2026-10-01T00:00:0${seq % 10}.000Z`,
  updatedAt: '2026-10-01T00:00:00.000Z',
  deletedAt: null,
  kind: 'expense',
  amountCents: 1000,
  direction: null,
  date: '2026-10-10',
  description: 'Almoço',
  categoryId: 'food',
  accountId: 'acc',
  cardId: null,
  invoiceId: null,
  transferPeerId: null,
  installmentGroupId: null,
  installmentNumber: null,
  installmentTotal: null,
  status: 'posted',
  source: 'manual',
  notes: null,
  ...fields,
});

describe('groupByDay', () => {
  it('agrupa do dia mais recente ao mais antigo, com o líquido do dia', () => {
    const groups = groupByDay([
      tx({ date: '2026-10-01', kind: 'income', amountCents: 5000 }),
      tx({ date: '2026-10-03', amountCents: 300 }),
      tx({ date: '2026-10-01', amountCents: 1200 }),
      tx({ date: '2026-10-03', kind: 'card_purchase', accountId: null, amountCents: 200 }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-10-03', '2026-10-01']);
    expect(groups[0].netCents).toBe(-500);
    expect(groups[1].netCents).toBe(3800);
  });

  it('transferências, pagamentos de fatura e ajustes não entram no líquido (regra 7)', () => {
    const [group] = groupByDay([
      tx({ kind: 'transfer', direction: 'out' }),
      tx({ kind: 'invoice_payment' }),
      tx({ kind: 'adjustment', direction: 'in' }),
    ]);
    expect(group.netCents).toBe(0);
    expect(group.transactions).toHaveLength(3);
  });

  it('dentro do dia, o criado por último vem primeiro', () => {
    const older = tx({ createdAt: '2026-10-10T08:00:00.000Z' });
    const newer = tx({ createdAt: '2026-10-10T20:00:00.000Z' });
    expect(groupByDay([older, newer])[0].transactions.map((t) => t.id)).toEqual([
      newer.id,
      older.id,
    ]);
  });
});

describe('monthSummary', () => {
  const rows = [
    tx({ kind: 'income', amountCents: 650000, categoryId: 'salary' }),
    tx({ amountCents: 180000, categoryId: 'home' }),
    tx({ kind: 'card_purchase', accountId: null, amountCents: 5000, categoryId: 'food' }),
    tx({ amountCents: 2000, categoryId: 'food' }),
    tx({ amountCents: 9000, categoryId: 'home', status: 'scheduled' }),
    tx({ kind: 'transfer', direction: 'out', amountCents: 99999 }),
    tx({ kind: 'invoice_payment', amountCents: 88888 }),
    tx({ amountCents: 777, deletedAt: '2026-10-11T00:00:00.000Z' }),
    tx({ amountCents: 555, date: '2026-11-01' }),
  ];

  it('soma receitas e despesas efetivadas do mês, sem movimentos internos', () => {
    const summary = monthSummary('2026-10', rows);
    expect(summary.incomeCents).toBe(650000);
    expect(summary.expenseCents).toBe(187000);
    expect(summary.netCents).toBe(463000);
  });

  it('previsto do mês soma também os agendados', () => {
    expect(monthSummary('2026-10', rows).projectedNetCents).toBe(463000 - 9000);
  });

  it('despesas por categoria, da maior para a menor', () => {
    expect(monthSummary('2026-10', rows).expensesByCategory).toEqual([
      { categoryId: 'home', expenseCents: 180000 },
      { categoryId: 'food', expenseCents: 7000 },
    ]);
  });
});

describe('matchesFilters', () => {
  const t = tx({ description: 'Padaria São João', kind: 'expense', categoryId: 'food' });

  it('busca ignora maiúsculas e acentos', () => {
    expect(matchesFilters(t, { search: 'sao joao' })).toBe(true);
    expect(matchesFilters(t, { search: 'PADARIA' })).toBe(true);
    expect(matchesFilters(t, { search: 'mercado' })).toBe(false);
  });

  it('combina tipo, categoria e origem', () => {
    expect(matchesFilters(t, { kinds: ['expense'], categoryIds: ['food'] })).toBe(true);
    expect(matchesFilters(t, { kinds: ['income'] })).toBe(false);
    expect(matchesFilters(t, { accountIds: ['outra'] })).toBe(false);
    expect(matchesFilters(t, { cardIds: ['card'] })).toBe(false);
  });

  it('sem filtros, tudo passa', () => {
    expect(matchesFilters(t, {})).toBe(true);
  });
});

describe('relatedIds', () => {
  it('transferência leva a outra perna', () => {
    const a = tx({ kind: 'transfer', direction: 'out' });
    const b = tx({ kind: 'transfer', direction: 'in', transferPeerId: a.id });
    a.transferPeerId = b.id;
    expect(relatedIds(a, [a, b, tx({})]).sort()).toEqual([a.id, b.id].sort());
  });

  it('parcela leva o grupo inteiro', () => {
    const group = [1, 2, 3].map((n) =>
      tx({ installmentGroupId: 'g', installmentNumber: n, installmentTotal: 3 }),
    );
    expect(relatedIds(group[1], [...group, tx({})]).sort()).toEqual(group.map((t) => t.id).sort());
  });

  it('lançamento simples leva só ele', () => {
    const single = tx({});
    expect(relatedIds(single, [single, tx({})])).toEqual([single.id]);
  });
});

describe('periodSummary', () => {
  const rows = [
    tx({ date: '2026-10-18', amountCents: 1000 }),
    tx({ date: '2026-10-19', amountCents: 2000 }),
    tx({ date: '2026-10-25', kind: 'income', amountCents: 5000 }),
    tx({ date: '2026-10-26', amountCents: 9999 }),
  ];

  it('inclui as duas pontas do período', () => {
    const summary = periodSummary('2026-10-19', '2026-10-25', rows);
    expect(summary).toMatchObject({
      from: '2026-10-19',
      to: '2026-10-25',
      expenseCents: 2000,
      incomeCents: 5000,
    });
  });

  it('um único dia', () => {
    expect(periodSummary('2026-10-18', '2026-10-18', rows).expenseCents).toBe(1000);
  });
});
