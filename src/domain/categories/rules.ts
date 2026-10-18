import { normalizeSearch } from '@/domain/transactions/rules';
import type { Category, CategoryKind, Id } from '@/domain/types';

/** Já existe categoria do mesmo tipo com esse nome (sem diferenciar maiúsculas e acentos)? */
export function isNameTaken(
  categories: readonly Pick<Category, 'id' | 'name' | 'kind'>[],
  name: string,
  kind: CategoryKind,
  exceptId?: Id,
): boolean {
  const target = normalizeSearch(name);
  return categories.some(
    (c) => c.id !== exceptId && c.kind === kind && normalizeSearch(c.name) === target,
  );
}
