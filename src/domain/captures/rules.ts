/**
 * Regras puras das capturas (Fase 2): escolher o parser, montar a sugestão, completar a
 * confirmação e aprender a origem. Usadas pelo fake e pelo serviço real da trilha D.
 */
import type { RawNotification } from '../../../modules/notification-capture/src/NotificationCapture.types';
import type { CaptureConfirmation, NotificationParser } from '@/domain/contracts';
import type { Capture, CaptureOriginRule, Entity, Id, ParsedNotification } from '@/domain/types';

export type ParseResult = { parser: string; parsed: ParsedNotification };

/** Primeiro os parsers do pacote, na ordem dada; depois os genéricos (sem pacotes). */
export function parseNotification(
  parsers: readonly NotificationParser[],
  raw: RawNotification,
): ParseResult | null {
  const specific = parsers.filter((p) => p.packages.includes(raw.packageName));
  const generic = parsers.filter((p) => p.packages.length === 0);
  for (const parser of [...specific, ...generic]) {
    const parsed = parser.parse(raw);
    if (parsed) return { parser: parser.id, parsed };
  }
  return null;
}

export type Origin = { accountId: Id | null; cardId: Id | null };

/** Regra do mesmo app e final de cartão; senão a regra do app para qualquer final. */
export function suggestOrigin(
  rules: readonly CaptureOriginRule[],
  packageName: string,
  cardLastDigits: string | null,
): Origin {
  const live = rules.filter((r) => r.deletedAt === null && r.packageName === packageName);
  const match =
    (cardLastDigits !== null && live.find((r) => r.cardLastDigits === cardLastDigits)) ||
    live.find((r) => r.cardLastDigits === null);
  return match
    ? { accountId: match.accountId, cardId: match.cardId }
    : { accountId: null, cardId: null };
}

/** Campos da captura a partir da notificação crua e do que o parser entendeu. */
export function buildCapture(
  raw: RawNotification,
  result: ParseResult | null,
  rules: readonly CaptureOriginRule[],
): Omit<Capture, keyof Entity> {
  const parsed = result?.parsed;
  // Não interpretada também recebe a origem do app: ajuda quem for completar à mão.
  const origin = suggestOrigin(rules, raw.packageName, parsed?.cardLastDigits ?? null);
  return {
    rawId: raw.id,
    packageName: raw.packageName,
    title: raw.title,
    text: raw.text,
    postedAt: new Date(raw.postedAtMs).toISOString(),
    parser: result?.parser ?? null,
    amountCents: parsed?.amountCents ?? null,
    kind: parsed?.kind ?? null,
    merchant: parsed?.merchant ?? null,
    date: parsed?.date ?? null,
    cardLastDigits: parsed?.cardLastDigits ?? null,
    suggestedAccountId: origin.accountId,
    suggestedCardId: origin.cardId,
    confidence: parsed ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    status: 'pending',
    transactionId: null,
  };
}

/**
 * Junta o que o usuário informou com a sugestão. `null` quando falta valor, tipo, data ou a
 * origem certa para o tipo (cartão para compra no cartão, conta para os demais).
 */
export function resolveConfirmation(
  capture: Capture,
  input: Partial<CaptureConfirmation>,
): CaptureConfirmation | null {
  const kind = input.kind ?? capture.kind;
  const amountCents = input.amountCents ?? capture.amountCents;
  const date = input.date ?? capture.date;
  if (!kind || !amountCents || amountCents <= 0 || !date) return null;

  const base = {
    kind,
    amountCents,
    date,
    description: input.description ?? capture.merchant ?? capture.title ?? capture.packageName,
    categoryId: input.categoryId ?? null,
  };
  if (kind === 'card_purchase') {
    const cardId = input.cardId ?? capture.suggestedCardId;
    return cardId ? { ...base, cardId, installments: input.installments ?? 1 } : null;
  }
  const accountId = input.accountId ?? capture.suggestedAccountId;
  return accountId ? { ...base, accountId } : null;
}

/** Regra a lembrar depois de confirmar: este app (e final de cartão) → esta origem. */
export function learnedRule(
  capture: Capture,
  confirmation: CaptureConfirmation,
): Omit<CaptureOriginRule, keyof Entity> {
  return {
    packageName: capture.packageName,
    cardLastDigits: capture.cardLastDigits,
    accountId: confirmation.cardId ? null : (confirmation.accountId ?? null),
    cardId: confirmation.cardId ?? null,
  };
}
