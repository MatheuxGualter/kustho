import { type DomainErrorCode, isDomainError } from '@/domain/errors';
import { strings } from '@/lib/strings';

const messages: Record<DomainErrorCode, string> = strings.errors.domain;

/** Mensagem para o usuário a partir de um erro de serviço. */
export function errorMessage(error: unknown): string {
  return isDomainError(error) ? messages[error.code] : strings.errors.generic;
}
