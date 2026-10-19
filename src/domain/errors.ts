/** Códigos de erro de regra de negócio; a interface traduz cada um em `strings.errors`. */
export const domainErrorCodes = [
  'account_has_transactions',
  'card_has_transactions',
  'category_in_use',
  'duplicate_name',
  'same_account_transfer',
  'invalid_amount',
  'not_found',
  'capture_incomplete',
  'already_linked',
  'receipt_unrecognized',
  'receipt_reader_unavailable',
] as const;

export type DomainErrorCode = (typeof domainErrorCodes)[number];

/** Erro de regra de negócio (não é bug): a tela mostra a mensagem ao usuário. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;
