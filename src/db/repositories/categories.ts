import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Category, CategoryKind } from '@/domain/types';
import type { CategoryInput } from '@/domain/contracts';
import { nowTimestamp } from '@/lib/id';

import type { AppDatabase } from '../database';
import { categories } from '../schema';
import { newEntity } from './common';

export type { CategoryInput };

export async function listCategories(db: AppDatabase, kind?: CategoryKind): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(and(isNull(categories.deletedAt), kind ? eq(categories.kind, kind) : undefined))
    .orderBy(asc(categories.name));
}

export async function createCategory(db: AppDatabase, input: CategoryInput): Promise<Category> {
  const row: Category = { ...newEntity(), ...input };
  await db.insert(categories).values(row);
  return row;
}

export async function updateCategory(
  db: AppDatabase,
  id: string,
  patch: Partial<CategoryInput>,
): Promise<void> {
  await db
    .update(categories)
    .set({ ...patch, updatedAt: nowTimestamp() })
    .where(eq(categories.id, id));
}

export async function setCategoryDeleted(db: AppDatabase, id: string, deleted: boolean) {
  const now = nowTimestamp();
  await db
    .update(categories)
    .set({ deletedAt: deleted ? now : null, updatedAt: now })
    .where(eq(categories.id, id));
}
