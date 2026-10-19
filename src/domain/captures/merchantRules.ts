/**
 * Regras aprendidas por estabelecimento (Fase 3, trilha B): cada confirmação ensina que
 * "IFOOD" é Alimentação e sai do cartão X; a próxima captura do mesmo lugar já chega com
 * categoria e origem. Regras puras; o serviço grava em `merchant_rules`.
 */
import type { CaptureConfirmation } from '@/domain/contracts';
import type { Capture, Entity, MerchantRule } from '@/domain/types';

const SUFFIXES = new Set(['ltda', 'me', 'sa', 'eireli', 'epp', 'cia', 'mei']);

/**
 * Nome normalizado do estabelecimento: sem acentos, minúsculo, sem números, pontuação e
 * sufixos de empresa ("LTDA", "S.A."). `null` se não sobra nada.
 */
export function merchantKey(merchant: string | null | undefined): string | null {
  if (!merchant) return null;
  const words = merchant
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bs\.?\s?a\.?(?=\s|$)/g, ' ')
    .replace(/[^a-z\s]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !SUFFIXES.has(w));
  return words.length > 0 ? words.join(' ') : null;
}

/** Captura com categoria e (se ainda sem origem) origem da regra do estabelecimento. */
export function applyMerchantRule<T extends Omit<Capture, keyof Entity>>(
  capture: T,
  rules: readonly MerchantRule[],
): T {
  const key = merchantKey(capture.merchant);
  const rule = key ? rules.find((r) => r.merchantKey === key && r.deletedAt === null) : undefined;
  if (!rule) return capture;
  const hasOrigin = capture.suggestedAccountId !== null || capture.suggestedCardId !== null;
  // Compra no cartão só aceita cartão; Pix e débito só aceitam conta.
  const fitsKind =
    capture.kind === 'card_purchase' ? rule.cardId !== null : rule.accountId !== null;
  return {
    ...capture,
    suggestedCategoryId: rule.categoryId ?? capture.suggestedCategoryId,
    ...(!hasOrigin && fitsKind
      ? { suggestedAccountId: rule.accountId, suggestedCardId: rule.cardId }
      : {}),
  };
}

/** Regra a gravar depois de confirmar ou vincular; `null` sem estabelecimento. */
export function learnedMerchantRule(
  capture: Pick<Capture, 'merchant'>,
  confirmed: Pick<CaptureConfirmation, 'categoryId'> & {
    accountId?: string | null;
    cardId?: string | null;
  },
): Omit<MerchantRule, keyof Entity | 'hits'> | null {
  const key = merchantKey(capture.merchant);
  if (!key) return null;
  const cardId = confirmed.cardId ?? null;
  return {
    merchantKey: key,
    categoryId: confirmed.categoryId ?? null,
    accountId: cardId ? null : (confirmed.accountId ?? null),
    cardId,
  };
}

/**
 * O usuário mudou algo da sugestão ao confirmar? Mede a precisão por fonte (trilha D):
 * só conta como "sem edição" o que foi confirmado exatamente como veio.
 */
export function confirmationEdited(capture: Capture, input: Partial<CaptureConfirmation>): boolean {
  const differs = <V>(value: V | undefined, suggested: V) =>
    value !== undefined && value !== suggested;
  return (
    differs(input.amountCents, capture.amountCents) ||
    differs(input.kind, capture.kind) ||
    differs(input.date, capture.date) ||
    differs(input.description, capture.merchant ?? capture.title ?? capture.packageName) ||
    differs(input.categoryId, capture.suggestedCategoryId) ||
    differs(input.accountId, capture.suggestedAccountId) ||
    differs(input.cardId, capture.suggestedCardId) ||
    differs(input.installments, capture.installments ?? 1)
  );
}
