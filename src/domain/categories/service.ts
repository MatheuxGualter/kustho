/**
 * Serviço real de categorias (trilha D) sobre o SQLite.
 */
import { and, count, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/database';
import * as repo from '@/db/repositories/categories';
import { transactions } from '@/db/schema';
import type { CategoriesService } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import { nowTimestamp } from '@/lib/id';

import { isNameTaken } from './rules';

export function createCategoriesService(db: AppDatabase): CategoriesService {
  const countUsage = async (id: string) => {
    const [{ total }] = await db
      .select({ total: count() })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));
    return total;
  };

  return {
    listCategories: (kind) => repo.listCategories(db, kind),

    async createCategory(input) {
      if (isNameTaken(await repo.listCategories(db), input.name, input.kind)) {
        throw new DomainError('duplicate_name');
      }
      return repo.createCategory(db, { ...input, name: input.name.trim() });
    },

    async updateCategory(id, patch) {
      const all = await repo.listCategories(db);
      const current = all.find((c) => c.id === id);
      if (!current) throw new DomainError('not_found');
      const name = patch.name ?? current.name;
      if (isNameTaken(all, name, patch.kind ?? current.kind, id)) {
        throw new DomainError('duplicate_name');
      }
      await repo.updateCategory(db, id, { ...patch, ...(patch.name ? { name: name.trim() } : {}) });
    },

    async deleteCategory(id, moveTo) {
      const used = await countUsage(id);
      if (used > 0) {
        if (!moveTo || moveTo === id) throw new DomainError('category_in_use');
        await db
          .update(transactions)
          .set({ categoryId: moveTo, updatedAt: nowTimestamp() })
          .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));
      }
      await repo.setCategoryDeleted(db, id, true);
    },

    restoreCategory: (id) => repo.setCategoryDeleted(db, id, false),
    countUsage,
  };
}
