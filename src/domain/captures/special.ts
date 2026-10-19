/**
 * Casos especiais das capturas (Fase 3, trilha C), em regras puras:
 * - duplicata: a mesma transação avisada por duas fontes (push + SMS, notificação +
 *   comprovante) vira um item só;
 * - estorno capturado: acha a compra do cartão que ele devolve.
 * Parcelas ("em 3x") são lidas pelo parser e criadas na confirmação.
 */
import type { Capture, Transaction } from '@/domain/types';
import { addDays, daysBetween } from '@/lib/dates';

import { type MatchableCapture, type MatchDecision, textSimilarity } from './matcher';

/** Push e SMS do mesmo banco chegam juntos. */
export const DUPLICATE_WINDOW_MS = 5 * 60_000;
/** O comprovante é compartilhado depois do Pix, às vezes bem depois. */
export const RECEIPT_DUPLICATE_WINDOW_MS = 60 * 60_000;

export type DuplicateCheck = Pick<
  Capture,
  'rawId' | 'packageName' | 'channel' | 'postedAt' | 'amountCents' | 'kind'
>;

const windowFor = (a: DuplicateCheck, b: DuplicateCheck) =>
  a.channel === 'receipt' || b.channel === 'receipt'
    ? RECEIPT_DUPLICATE_WINDOW_MS
    : DUPLICATE_WINDOW_MS;

/**
 * Captura já gravada que é a mesma transação: mesmo valor e tipo, de **outra** fonte
 * (outro app ou outro canal; dois cafés iguais no mesmo app são duas compras), dentro da
 * janela. Vale contra pendentes e confirmadas; descartadas e duplicatas não contam.
 */
export function findDuplicate(
  capture: DuplicateCheck,
  existing: readonly Capture[],
): Capture | null {
  const { amountCents, kind } = capture;
  if (!amountCents || !kind) return null;
  const at = Date.parse(capture.postedAt);
  const ranked = existing
    .filter(
      (c) =>
        c.deletedAt === null &&
        c.status !== 'discarded' &&
        c.duplicateOfId === null &&
        c.rawId !== capture.rawId &&
        c.amountCents === amountCents &&
        c.kind === kind &&
        (c.packageName !== capture.packageName || c.channel !== capture.channel) &&
        Math.abs(Date.parse(c.postedAt) - at) <= windowFor(capture, c),
    )
    .sort((a, b) => Math.abs(Date.parse(a.postedAt) - at) - Math.abs(Date.parse(b.postedAt) - at));
  return ranked[0] ?? null;
}

/** Período de `postedAt` a carregar para procurar duplicatas (a maior janela). */
export function duplicateWindow(postedAt: string): { from: string; to: string } {
  const at = Date.parse(postedAt);
  return {
    from: new Date(at - RECEIPT_DUPLICATE_WINDOW_MS).toISOString(),
    to: new Date(at + RECEIPT_DUPLICATE_WINDOW_MS).toISOString(),
  };
}

/** Até quantos dias depois da compra um estorno é procurado. */
export const REFUND_MAX_DAYS = 120;
/** A partir desta pontuação a compra é sugerida. */
export const REFUND_THRESHOLD = 0.6;

const REFUND_BASE = 0.4;
const REFUND_TEXT = 0.4;
const REFUND_EXACT = 0.2;

export type RefundOption = { tx: Transaction; refundableCents: number };

/**
 * Compra que o estorno devolve: compra no cartão (o sugerido, se houver), até
 * `REFUND_MAX_DAYS` antes, com saldo a estornar que cubra o valor. Pontua o
 * estabelecimento parecido e o valor exato; empate fica com a compra mais recente.
 * A decisão vai para `matchTransactionId` da captura de estorno.
 */
export function findRefundTarget(
  capture: MatchableCapture,
  options: readonly RefundOption[],
): MatchDecision {
  const { amountCents, date } = capture;
  if (!amountCents || !date || capture.kind !== 'card_refund')
    return { action: 'create', score: 0 };
  const ranked = options
    .filter(({ tx, refundableCents }) => {
      const days = daysBetween(tx.date, date);
      return (
        tx.deletedAt === null &&
        tx.kind === 'card_purchase' &&
        refundableCents >= amountCents &&
        days >= 0 &&
        days <= REFUND_MAX_DAYS &&
        (!capture.suggestedCardId || tx.cardId === capture.suggestedCardId)
      );
    })
    .map(({ tx }) => ({
      tx,
      score: Math.min(
        1,
        REFUND_BASE +
          REFUND_TEXT * textSimilarity(capture.merchant, tx.description) +
          (tx.amountCents === amountCents ? REFUND_EXACT : 0),
      ),
    }))
    .sort((a, b) => b.score - a.score || b.tx.date.localeCompare(a.tx.date));
  const best = ranked[0];
  if (!best) return { action: 'create', score: 0 };
  return best.score >= REFUND_THRESHOLD
    ? { action: 'link', transactionId: best.tx.id, score: best.score }
    : { action: 'create', score: best.score };
}

/** Período de compras a carregar para procurar a compra de um estorno. */
export function refundWindow(date: string): { from: string; to: string } {
  return { from: addDays(date, -REFUND_MAX_DAYS), to: date };
}
