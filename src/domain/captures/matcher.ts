/**
 * Matcher (Fase 3, trilha A): a captura é um lançamento que o usuário já registrou à mão?
 * Regras puras, do "Algoritmo de vínculo" do plano: candidatos com o mesmo valor, na mesma
 * origem e até 2 dias de distância; pontuação de 0 a 1; acima do limiar, "vincular".
 */
import { normalizeSearch } from '@/domain/transactions/rules';
import type { Capture, Transaction } from '@/domain/types';
import { addDays, daysBetween } from '@/lib/dates';

/** Dias de distância aceitos entre a captura e o lançamento. */
export const MAX_DAYS = 2;
/** A partir desta pontuação o matcher sugere vincular em vez de criar. */
export const LINK_THRESHOLD = 0.7;

const BASE = 0.5;
const SAME_ORIGIN = 0.2;
const SIMILAR_TEXT = 0.3;
const PER_DAY = 0.1;

/** O que o matcher usa de uma captura (serve também para a captura ainda não gravada). */
export type MatchableCapture = Pick<
  Capture,
  'amountCents' | 'kind' | 'date' | 'merchant' | 'suggestedAccountId' | 'suggestedCardId'
>;

export type MatchDecision =
  { action: 'link'; transactionId: string; score: number } | { action: 'create'; score: number };

/** Origem da captura casa com a do lançamento (conta para Pix/débito, cartão para compra). */
function sameOrigin(capture: MatchableCapture, tx: Transaction): boolean {
  if (capture.suggestedCardId) return tx.cardId === capture.suggestedCardId;
  if (capture.suggestedAccountId) return tx.accountId === capture.suggestedAccountId;
  return false;
}

const hasOrigin = (capture: MatchableCapture) =>
  capture.suggestedAccountId !== null || capture.suggestedCardId !== null;

/**
 * Lançamentos que podem ser a mesma transação: mesmo valor e tipo, não excluídos, ainda
 * não ligados a outra captura (`linked`), até `MAX_DAYS` dias e, se a captura já tem
 * origem sugerida, na mesma conta ou cartão.
 */
export function findCandidates(
  capture: MatchableCapture,
  transactions: readonly Transaction[],
  linked: ReadonlySet<string>,
): Transaction[] {
  const { amountCents, kind, date } = capture;
  if (!amountCents || !kind || !date) return [];
  return transactions.filter(
    (tx) =>
      tx.deletedAt === null &&
      !linked.has(tx.id) &&
      tx.kind === kind &&
      tx.amountCents === amountCents &&
      Math.abs(daysBetween(date, tx.date)) <= MAX_DAYS &&
      (!hasOrigin(capture) || sameOrigin(capture, tx)),
  );
}

const STOP_WORDS = new Set(['de', 'da', 'do', 'e', 'em', 'ltda', 'me', 'sa', 'eireli', 'pix']);

function words(text: string): Set<string> {
  return new Set(
    normalizeSearch(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w)),
  );
}

/** 0 a 1: quanto a descrição do lançamento lembra o estabelecimento da captura. */
export function textSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const na = normalizeSearch(a).trim();
  const nb = normalizeSearch(b).trim();
  if (na && nb && (na.includes(nb) || nb.includes(na))) return 1;
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size);
}

/** Pontuação de 0 a 1 de um candidato (o valor igual já é exigido por `findCandidates`). */
export function scoreMatch(capture: MatchableCapture, tx: Transaction): number {
  let score = BASE;
  if (sameOrigin(capture, tx)) score += SAME_ORIGIN;
  score += SIMILAR_TEXT * textSimilarity(capture.merchant, tx.description);
  if (capture.date) score -= PER_DAY * Math.abs(daysBetween(capture.date, tx.date));
  return Math.min(1, Math.max(0, score));
}

/**
 * Vincular ao melhor candidato, se passar do limiar; senão criar. Empate (dois gastos
 * iguais no mesmo dia): o lançamento mais antigo primeiro, para cada captura pegar um.
 */
export function decideMatch(
  capture: MatchableCapture,
  transactions: readonly Transaction[],
  linked: ReadonlySet<string>,
): MatchDecision {
  const ranked = findCandidates(capture, transactions, linked)
    .map((tx) => ({ tx, score: scoreMatch(capture, tx) }))
    .sort((a, b) => b.score - a.score || a.tx.createdAt.localeCompare(b.tx.createdAt));
  const best = ranked[0];
  if (!best) return { action: 'create', score: 0 };
  return best.score >= LINK_THRESHOLD
    ? { action: 'link', transactionId: best.tx.id, score: best.score }
    : { action: 'create', score: best.score };
}

/** Período de lançamentos a carregar para procurar candidatos de uma captura na data. */
export function candidateWindow(date: string): { from: string; to: string } {
  return { from: addDays(date, -MAX_DAYS), to: addDays(date, MAX_DAYS) };
}

/** Campos de sugestão de vínculo para gravar na captura. */
export function matchFields(decision: MatchDecision): {
  matchTransactionId: string | null;
  matchScore: number;
} {
  return decision.action === 'link'
    ? { matchTransactionId: decision.transactionId, matchScore: decision.score }
    : { matchTransactionId: null, matchScore: 0 };
}
