/**
 * Fake da trilha D em memória. Usa as mesmas regras puras do serviço real
 * (`src/domain/categories/rules.ts`); só o armazenamento é diferente.
 */
import { isNameTaken } from '@/domain/categories/rules';
import type { CategoriesService } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import { nowTimestamp } from '@/lib/id';

import { notifyDataChanged } from '../dataVersion';
import { entity } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

export function createFakeCategoriesService(store: FakeStore): CategoriesService {
  const used = (id: string) => alive(store.transactions).filter((t) => t.categoryId === id);
  return {
    async listCategories(kind) {
      return alive(store.categories)
        .filter((c) => !kind || c.kind === kind)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async createCategory(input) {
      if (isNameTaken(alive(store.categories), input.name, input.kind)) {
        throw new DomainError('duplicate_name');
      }
      const category = { ...entity(), ...input, name: input.name.trim() };
      store.categories.push(category);
      notifyDataChanged();
      return category;
    },
    async updateCategory(id, patch) {
      const current = alive(store.categories).find((c) => c.id === id);
      if (!current) throw new DomainError('not_found');
      const name = patch.name ?? current.name;
      if (isNameTaken(alive(store.categories), name, patch.kind ?? current.kind, id)) {
        throw new DomainError('duplicate_name');
      }
      Object.assign(current, patch, { name: name.trim(), updatedAt: nowTimestamp() });
      notifyDataChanged();
    },
    async deleteCategory(id, moveTo) {
      const rows = used(id);
      if (rows.length > 0 && (!moveTo || moveTo === id)) throw new DomainError('category_in_use');
      rows.forEach((t) => (t.categoryId = moveTo ?? null));
      findOrThrow(store.categories, id, 'Categoria').deletedAt = nowTimestamp();
      notifyDataChanged();
    },
    async restoreCategory(id) {
      findOrThrow(store.categories, id, 'Categoria').deletedAt = null;
      notifyDataChanged();
    },
    async countUsage(id) {
      return used(id).length;
    },
  };
}
