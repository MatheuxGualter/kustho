/**
 * Ciclo de fatura: em que fatura cai uma compra, e quando ela fecha e vence.
 * Regras 3 e 4 de docs/plano.md, mais os casos de borda (dia do fechamento,
 * dia inexistente, vencimento antes do fechamento).
 */
import type { CreditCard, ISODate, YearMonth } from '@/domain/types';
import { addMonths, compareDates, dateInMonth, monthOf } from '@/lib/dates';

export type CardCycleConfig = Pick<CreditCard, 'closingDay' | 'dueDay'>;

export type InvoiceCycle = {
  /** Mês do vencimento. */
  referenceMonth: YearMonth;
  closingDate: ISODate;
  dueDate: ISODate;
};

/**
 * Datas da fatura de um mês de referência. Se o vencimento é antes (ou no mesmo dia)
 * do fechamento no calendário, a fatura fecha no mês anterior ao do vencimento.
 */
export function cycleForReferenceMonth(
  card: CardCycleConfig,
  referenceMonth: YearMonth,
): InvoiceCycle {
  const closingMonth =
    card.dueDay > card.closingDay ? referenceMonth : addMonths(referenceMonth, -1);
  return {
    referenceMonth,
    closingDate: dateInMonth(closingMonth, card.closingDay),
    dueDate: dateInMonth(referenceMonth, card.dueDay),
  };
}

function referenceMonthForClosingMonth(card: CardCycleConfig, closingMonth: YearMonth): YearMonth {
  return card.dueDay > card.closingDay ? closingMonth : addMonths(closingMonth, 1);
}

/**
 * Fatura de uma compra: se a compra é anterior ao fechamento do mês, entra na fatura que
 * fecha naquele mês; no dia do fechamento ou depois, na seguinte.
 */
export function cycleForPurchase(card: CardCycleConfig, purchaseDate: ISODate): InvoiceCycle {
  const purchaseMonth = monthOf(purchaseDate);
  const closingThisMonth = dateInMonth(purchaseMonth, card.closingDay);
  const closingMonth =
    compareDates(purchaseDate, closingThisMonth) < 0 ? purchaseMonth : addMonths(purchaseMonth, 1);
  return cycleForReferenceMonth(card, referenceMonthForClosingMonth(card, closingMonth));
}

/** Faturas das N parcelas de uma compra: a primeira pela regra da compra, as demais nas seguintes. */
export function installmentCycles(
  card: CardCycleConfig,
  purchaseDate: ISODate,
  installments: number,
): InvoiceCycle[] {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new Error(`Número de parcelas inválido: ${installments}`);
  }
  const first = cycleForPurchase(card, purchaseDate);
  return Array.from({ length: installments }, (_, i) =>
    cycleForReferenceMonth(card, addMonths(first.referenceMonth, i)),
  );
}
