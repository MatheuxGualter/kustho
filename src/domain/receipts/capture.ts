/**
 * Comprovante → captura (Fase 3, trilha E). O comprovante entra em Pendentes como
 * qualquer notificação: com `channel: 'receipt'`, a conta sugerida pelo banco que aparece
 * no comprovante e, depois, o matcher.
 */
import { captureExtrasDefaults } from '@/domain/captures/rules';
import type { Account, Capture, Entity } from '@/domain/types';
import { type Bank, banks, resolveBank } from '@/ui/banks/banks';

import { parseReceipt } from './parser';

/** `packageName` das capturas vindas de comprovante (não há app de banco conhecido). */
export const RECEIPT_SOURCE = 'kustho.comprovante';

const MAX_TEXT = 4000;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Nomes e apelidos de cada banco, do mais longo ao mais curto ("banco do brasil" antes de "bb").
const bankKeys = banks
  .flatMap((bank) =>
    [bank.id, bank.name, ...bank.aliases].map((k) => [normalize(k), bank] as const),
  )
  .filter(([key]) => key.length >= 2)
  .sort((a, b) => b[0].length - a[0].length);

/** Banco do catálogo citado num texto ("NU PAGAMENTOS - IP" → Nubank). */
export function bankInText(text: string): Bank | undefined {
  const padded = ` ${normalize(text)} `;
  return bankKeys.find(([key]) => padded.includes(` ${key} `))?.[1];
}

/** Prefixo do `rawId` de comprovante identificado pelo ID do Pix. */
export const PIX_RAW_ID_PREFIX = 'receipt:pix:';

// ID do Pix (end-to-end do Banco Central): E + ISPB (8) + AAAAMMDDHHMM (12) + 11 caracteres.
const END_TO_END = /\bE[0-9O]{20}[0-9A-Z]{11}/;

/**
 * ID do Pix citado no comprovante, ou `null`. O OCR confunde O e 0; o O vira 0 para que
 * imagem e PDF do mesmo comprovante deem o mesmo ID.
 */
export function pixEndToEndId(text: string): string | null {
  return END_TO_END.exec(text.toUpperCase())?.[0].replace(/O/g, '0') ?? null;
}

/**
 * Identificador estável do comprovante: compartilhar duas vezes não cria duas capturas.
 * Com o ID do Pix, é ele (o texto muda entre imagem e PDF); sem, um hash do texto.
 */
export function receiptRawId(text: string): string {
  const endToEnd = pixEndToEndId(text);
  if (endToEnd) return `${PIX_RAW_ID_PREFIX}${endToEnd}`;
  // FNV-1a de 32 bits sobre o texto sem espaços repetidos.
  let hash = 0x811c9dc5;
  for (const char of text.replace(/\s+/g, ' ').trim()) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `receipt:${hash.toString(16).padStart(8, '0')}`;
}

/** Campos da captura, ou `null` se o texto não parece um comprovante. */
export function buildReceiptCapture(
  text: string,
  receivedAtMs: number,
  accounts: readonly Account[],
): Omit<Capture, keyof Entity> | null {
  const parsed = parseReceipt(text, receivedAtMs);
  if (!parsed) return null;
  const bank = parsed.institution ? bankInText(parsed.institution) : undefined;
  const account = bank
    ? accounts.find(
        (a) => a.archivedAt === null && resolveBank(a.institution, a.icon)?.id === bank.id,
      )
    : undefined;
  return {
    rawId: receiptRawId(text),
    packageName: RECEIPT_SOURCE,
    title: parsed.kind === 'income' ? 'Comprovante de Pix recebido' : 'Comprovante de Pix enviado',
    text: text.trim().slice(0, MAX_TEXT),
    postedAt: new Date(receivedAtMs).toISOString(),
    parser: 'receipt',
    amountCents: parsed.amountCents,
    kind: parsed.kind,
    merchant: parsed.counterpart,
    date: parsed.date,
    cardLastDigits: null,
    suggestedAccountId: account?.id ?? null,
    suggestedCardId: null,
    confidence: parsed.confidence,
    status: 'pending',
    transactionId: null,
    ...captureExtrasDefaults,
    channel: 'receipt',
  };
}
