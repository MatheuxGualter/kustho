import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

import type { ReceiptReaderApi } from '../../../modules/receipt-reader';
import { DomainError } from '@/domain/errors';

/** O que chegou pelo "Compartilhar": texto direto ou um arquivo (imagem, PDF) para o OCR. */
export type SharedReceipt =
  { kind: 'text'; text: string } | { kind: 'file'; uri: string; mimeType: string | null };

/** Primeiro item útil do compartilhamento; `null` se nada serve (vídeo, áudio…). */
export function sharedReceiptFrom(
  payloads: readonly (ResolvedSharePayload | SharePayload)[],
): SharedReceipt | null {
  for (const payload of payloads) {
    const resolved = 'contentUri' in payload ? payload : null;
    const mimeType = resolved?.contentMimeType ?? payload.mimeType ?? null;
    if (payload.shareType === 'text' || payload.shareType === 'url') {
      if (payload.value.trim()) return { kind: 'text', text: payload.value };
      continue;
    }
    const isReadable =
      payload.shareType === 'image' ||
      mimeType?.startsWith('image/') ||
      mimeType === 'application/pdf';
    const uri = resolved?.contentUri ?? payload.value;
    if (isReadable && uri) return { kind: 'file', uri, mimeType };
  }
  return null;
}

/** Texto do comprovante: o próprio texto ou o OCR feito no aparelho. */
export async function sharedReceiptText(
  receipt: SharedReceipt,
  reader: ReceiptReaderApi | null,
): Promise<string> {
  if (receipt.kind === 'text') return receipt.text;
  if (!reader) throw new DomainError('receipt_reader_unavailable');
  return reader.recognizeText(receipt.uri, receipt.mimeType);
}
