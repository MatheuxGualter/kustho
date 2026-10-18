/**
 * Regras de lançamentos (trilha B): agrupar por dia, resumo do mês, filtros e o que é
 * excluído junto. Funções puras.
 */
import type { CategoryTotal, MonthSummary } from '@/domain/contracts';
import type { Cents, DayGroup, Id, Transaction, TxFilters, YearMonth } from '@/domain/types';
import { compareDates, monthOf } from '@/lib/dates';

/** Receita em relatórios. Transferências, pagamentos de fatura e ajustes não contam. */
export const isIncome = (t: Pick<Transaction, 'kind'>) => t.kind === 'income';
/** Despesa em relatórios: gasto em conta ou compra no cartão. */
export const isExpense = (t: Pick<Transaction, 'kind'>) =>
  t.kind === 'expense' || t.kind === 'card_purchase';

/** Receitas − despesas (movimentos internos não entram). */
export function netCents(rows: readonly Transaction[]): Cents {
  return rows.reduce(
    (sum, t) => sum + (isIncome(t) ? t.amountCents : isExpense(t) ? -t.amountCents : 0),
    0,
  );
}

const newestFirst = (a: Transaction, b: Transaction) =>
  compareDates(b.date, a.date) || b.createdAt.localeCompare(a.createdAt);

/** Agrupa por dia, do mais recente ao mais antigo; no dia, o criado por último primeiro. */
export function groupByDay(rows: readonly Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const tx of [...rows].sort(newestFirst)) {
    let group = groups.at(-1);
    if (!group || group.date !== tx.date) {
      group = { date: tx.date, transactions: [], netCents: 0 };
      groups.push(group);
    }
    group.transactions.push(tx);
  }
  for (const group of groups) group.netCents = netCents(group.transactions);
  return groups;
}

/** Resumo do mês a partir dos lançamentos (os de outros meses e excluídos são ignorados). */
export function monthSummary(month: YearMonth, rows: readonly Transaction[]): MonthSummary {
  const inMonth = rows.filter((t) => t.deletedAt === null && monthOf(t.date) === month);
  const posted = inMonth.filter((t) => t.status === 'posted');
  const totals = new Map<Id | null, Cents>();
  for (const t of posted.filter(isExpense)) {
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountCents);
  }
  const expensesByCategory: CategoryTotal[] = [...totals]
    .map(([categoryId, expenseCents]) => ({ categoryId, expenseCents }))
    .sort((a, b) => b.expenseCents - a.expenseCents);
  const incomeCents = posted.filter(isIncome).reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = posted.filter(isExpense).reduce((s, t) => s + t.amountCents, 0);
  return {
    month,
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    projectedNetCents: netCents(inMonth.filter((t) => t.status !== 'pending')),
    expensesByCategory,
  };
}

/** Minúsculas e sem acentos, para a busca. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function matchesFilters(tx: Transaction, filters: TxFilters): boolean {
  const search = filters.search ? normalizeSearch(filters.search) : '';
  const includes = <T>(list: readonly T[] | undefined, value: T) => !list || list.includes(value);
  return (
    (!search || normalizeSearch(tx.description).includes(search)) &&
    includes(filters.kinds, tx.kind) &&
    includes(filters.statuses, tx.status) &&
    (!filters.categoryIds ||
      (tx.categoryId !== null && filters.categoryIds.includes(tx.categoryId))) &&
    (!filters.accountIds || (tx.accountId !== null && filters.accountIds.includes(tx.accountId))) &&
    (!filters.cardIds || (tx.cardId !== null && filters.cardIds.includes(tx.cardId)))
  );
}

/**
 * IDs que saem junto quando `tx` é excluído: a outra perna da transferência ou as demais
 * parcelas da mesma compra.
 */
export function relatedIds(tx: Transaction, all: readonly Transaction[]): Id[] {
  if (tx.installmentGroupId) {
    return all.filter((t) => t.installmentGroupId === tx.installmentGroupId).map((t) => t.id);
  }
  if (tx.transferPeerId) return [tx.id, tx.transferPeerId];
  return [tx.id];
}
