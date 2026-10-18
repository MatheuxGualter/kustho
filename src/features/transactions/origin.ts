import type { Id } from '@/domain/types';

/** Origem de um lançamento no formulário: conta ou cartão, codificada como texto. */
export type Origin = { kind: 'account' | 'card'; id: Id };

export const encodeOrigin = ({ kind, id }: Origin) => `${kind}:${id}`;

export function decodeOrigin(value: string | null): Origin | null {
  const match = value ? /^(account|card):(.+)$/.exec(value) : null;
  return match ? { kind: match[1] as Origin['kind'], id: match[2] } : null;
}
