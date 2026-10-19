/**
 * Contrato do módulo de OCR de comprovantes (Fase 3, trilha E). Só lê o texto; quem
 * interpreta é `src/domain/receipts/`.
 */
export interface ReceiptReaderApi {
  /**
   * Texto de uma imagem (PNG, JPG…) ou PDF compartilhado com o Kustho, lido no aparelho.
   * `uri` é a URI recebida do compartilhamento (`content://` ou `file://`).
   */
  recognizeText(uri: string, mimeType: string | null): Promise<string>;
}
