/** Fake da trilha D. Aproximação em memória; as regras oficiais ficam no serviço real. */
import type { CategoriesService } from '@/domain/contracts';
import { nowTimestamp } from '@/lib/id';

import { notifyDataChanged } from '../dataVersion';
import { entity } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

export function createFakeCategoriesService(store: FakeStore): CategoriesService {
  return {
    async listCategories(kind) {
      return alive(store.categories)
        .filter((c) => !kind || c.kind === kind)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
    async createCategory(input) {
      const category = { ...entity(), ...input };
      store.categories.push(category);
      notifyDataChanged();
      return category;
    },
    async updateCategory(id, patch) {
      Object.assign(findOrThrow(store.categories, id, 'Categoria'), patch, {
        updatedAt: nowTimestamp(),
      });
      notifyDataChanged();
    },
    async deleteCategory(id, moveTo) {
      const used = alive(store.transactions).filter((t) => t.categoryId === id);
      if (used.length > 0 && !moveTo) {
        throw new Error('Categoria com lançamentos: escolha outra para movê-los');
      }
      used.forEach((t) => (t.categoryId = moveTo ?? null));
      findOrThrow(store.categories, id, 'Categoria').deletedAt = nowTimestamp();
      notifyDataChanged();
    },
  };
}
