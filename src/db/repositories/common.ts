import type { Entity } from '@/domain/types';
import { newId, nowTimestamp } from '@/lib/id';

/** Campos de uma entidade nova: ID do aparelho e timestamps. */
export function newEntity(): Entity {
  const now = nowTimestamp();
  return { id: newId(), createdAt: now, updatedAt: now, deletedAt: null };
}

/** Campos que nenhuma entrada de criação ou edição informa. */
export type EntityKeys = keyof Entity;
