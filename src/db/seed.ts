import { count } from 'drizzle-orm';

import type { Category, CategoryKind } from '@/domain/types';
import { newId, nowTimestamp } from '@/lib/id';
import { accentPalette } from '@/ui/tokens';

import type { Database } from './client';
import { categories } from './schema';

type DefaultCategory = { name: string; kind: CategoryKind; icon: string; color: string };

/** Categorias criadas na primeira abertura. `icon` é o nome do ícone no lucide. */
export const defaultCategories: readonly DefaultCategory[] = [
  { name: 'Alimentação', kind: 'expense', icon: 'utensils', color: accentPalette[3] },
  { name: 'Mercado', kind: 'expense', icon: 'shopping-cart', color: accentPalette[5] },
  { name: 'Transporte', kind: 'expense', icon: 'car', color: accentPalette[6] },
  { name: 'Moradia', kind: 'expense', icon: 'house', color: accentPalette[7] },
  { name: 'Contas', kind: 'expense', icon: 'receipt', color: accentPalette[8] },
  { name: 'Saúde', kind: 'expense', icon: 'heart-pulse', color: accentPalette[9] },
  { name: 'Educação', kind: 'expense', icon: 'graduation-cap', color: accentPalette[1] },
  { name: 'Lazer', kind: 'expense', icon: 'party-popper', color: accentPalette[2] },
  { name: 'Compras', kind: 'expense', icon: 'shopping-bag', color: accentPalette[4] },
  { name: 'Assinaturas', kind: 'expense', icon: 'repeat', color: accentPalette[0] },
  { name: 'Viagem', kind: 'expense', icon: 'plane', color: accentPalette[6] },
  { name: 'Pets', kind: 'expense', icon: 'paw-print', color: accentPalette[3] },
  { name: 'Outros', kind: 'expense', icon: 'circle-ellipsis', color: accentPalette[8] },
  { name: 'Salário', kind: 'income', icon: 'briefcase', color: accentPalette[5] },
  { name: 'Freelance', kind: 'income', icon: 'laptop', color: accentPalette[0] },
  { name: 'Rendimentos', kind: 'income', icon: 'trending-up', color: accentPalette[6] },
  { name: 'Reembolso', kind: 'income', icon: 'undo-2', color: accentPalette[7] },
  { name: 'Presente', kind: 'income', icon: 'gift', color: accentPalette[2] },
  { name: 'Outros', kind: 'income', icon: 'circle-ellipsis', color: accentPalette[8] },
];

export function buildDefaultCategories(timestamp = nowTimestamp(), makeId = newId): Category[] {
  return defaultCategories.map((c) => ({
    ...c,
    id: makeId(),
    parentId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }));
}

/** Cria as categorias padrão se a tabela estiver vazia. Idempotente. */
export async function seedDefaultCategories(db: Database): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(categories);
  if (total > 0) return;
  await db.insert(categories).values(buildDefaultCategories());
}
