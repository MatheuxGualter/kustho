/**
 * Regras de cartões e faturas (regras 3 a 6 de docs/plano.md e estorno). Funções puras.
 * As datas de cada fatura vêm de `src/domain/invoices/cycle.ts`.
 */
import { DomainError } from '@/domain/errors';
import {
  type CardCycleConfig,
  cycleForPurchase,
  installmentCycles,
  type InvoiceCycle,
} from '@/domain/invoices/cycle';
import type {
  Cents,
  Id,
  Invoice,
  InvoiceStatus,
  ISODate,
  Transaction,
  YearMonth,
} from '@/domain/types';
import { addMonths, compareDates, dateInMonth, monthOf, parseISODate } from '@/lib/dates';
import { splitInstallments } from '@/lib/money';

export type InvoiceTotals = { totalCents: Cents; paidCents: Cents; remainingCents: Cents };

type InvoiceTx = Pick<
  Transaction,
  'kind' | 'amountCents' | 'direction' | 'deletedAt' | 'invoiceId'
>;

/** Valor que um lançamento soma à fatura: compras somam, estornos (`adjustment in`) subtraem. */
function chargeOf(tx: InvoiceTx): Cents {
  if (tx.kind === 'card_purchase') return tx.amountCents;
  if (tx.kind === 'adjustment') return tx.direction === 'in' ? -tx.amountCents : tx.amountCents;
  return 0;
}

/** Total (compras − estornos), pago e restante (nunca negativo) de uma fatura. */
export function invoiceTotals(invoiceId: Id, rows: readonly InvoiceTx[]): InvoiceTotals {
  let totalCents = 0;
  let paidCents = 0;
  for (const tx of rows) {
    if (tx.invoiceId !== invoiceId || tx.deletedAt !== null) continue;
    if (tx.kind === 'invoice_payment') paidCents += tx.amountCents;
    else totalCents += chargeOf(tx);
  }
  return { totalCents, paidCents, remainingCents: Math.max(0, totalCents - paidCents) };
}

/**
 * Situação da fatura (regra 6): paga quando nada resta de um valor pago; parcial com
 * pagamento menor que o total; senão aberta até o fechamento e fechada a partir dele.
 */
export function invoiceStatus(
  invoice: Pick<Invoice, 'closingDate'>,
  totals: InvoiceTotals,
  today: ISODate,
): InvoiceStatus {
  if (totals.paidCents > 0) return totals.remainingCents === 0 ? 'paid' : 'partial';
  return compareDates(today, invoice.closingDate) >= 0 ? 'closed' : 'open';
}

/** Regra 5: limite − restante de todas as faturas (inclui as futuras, com parcelas). */
export function availableLimit(limitCents: Cents, invoices: readonly InvoiceTotals[]): Cents {
  return invoices.reduce((available, i) => available - i.remainingCents, limitCents);
}

export type PurchaseRow = {
  amountCents: Cents;
  /** A parcela i tem a data da compra + i meses (dia inexistente cai no último). */
  date: ISODate;
  cycle: InvoiceCycle;
  installmentNumber: number | null;
};

/**
 * Regras 3 e 4: as linhas de uma compra no cartão. N parcelas, uma em cada fatura seguinte,
 * com o resto da divisão na primeira.
 */
export function buildCardPurchase(
  card: CardCycleConfig,
  { amountCents, installments, date }: { amountCents: Cents; installments: number; date: ISODate },
): PurchaseRow[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new DomainError('invalid_amount');
  }
  const amounts = splitInstallments(amountCents, installments);
  const { day } = parseISODate(date);
  return installmentCycles(card, date, installments).map((cycle, i) => ({
    amountCents: amounts[i],
    date: i === 0 ? date : dateInMonth(addMonths(monthOf(date), i), day),
    cycle,
    installmentNumber: installments > 1 ? i + 1 : null,
  }));
}

/**
 * Estorno: entra na fatura da compra se ela ainda não fechou; senão, na fatura aberta na
 * data do estorno. Devolve o mês de referência da fatura de destino.
 */
export function refundReferenceMonth(
  card: CardCycleConfig,
  purchaseInvoice: Pick<Invoice, 'referenceMonth' | 'closingDate'>,
  refundDate: ISODate,
): YearMonth {
  return compareDates(refundDate, purchaseInvoice.closingDate) < 0
    ? purchaseInvoice.referenceMonth
    : cycleForPurchase(card, refundDate).referenceMonth;
}

/** Quanto da compra ainda pode ser estornado: o valor menos os estornos já feitos. */
export function refundableCents(
  purchase: Pick<Transaction, 'amountCents'>,
  refunds: readonly Pick<Transaction, 'amountCents'>[],
): Cents {
  return Math.max(0, purchase.amountCents - refunds.reduce((sum, r) => sum + r.amountCents, 0));
}
