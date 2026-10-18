import type { Category, CategoryKind } from '@/domain/types';
import { newId, nowTimestamp } from '@/lib/id';
import { accentPalette } from '@/ui/tokens';

import type { AppDatabase } from './database';
import { categories } from './schema';

type DefaultCategory = { name: string; kind: CategoryKind; icon: string; color: string };

/**
 * Categorias acrescentadas depois da primeira versão. Quem já usava o app recebe estas
 * uma única vez (ver `seedDefaultCategories`); quem instala agora já as recebe na lista.
 */
export const addedInV2: readonly DefaultCategory[] = [
  { name: 'Farmácia', kind: 'expense', icon: 'pill', color: accentPalette[9] },
  { name: 'Beleza', kind: 'expense', icon: 'sparkles', color: accentPalette[2] },
  { name: 'Roupas', kind: 'expense', icon: 'shirt', color: accentPalette[1] },
  { name: 'Academia', kind: 'expense', icon: 'dumbbell', color: accentPalette[5] },
  { name: 'Combustível', kind: 'expense', icon: 'fuel', color: accentPalette[3] },
  { name: 'Filhos', kind: 'expense', icon: 'baby', color: accentPalette[6] },
  { name: 'Impostos e taxas', kind: 'expense', icon: 'landmark', color: accentPalette[8] },
  { name: 'Presentes', kind: 'expense', icon: 'gift', color: accentPalette[2] },
  { name: 'Doações', kind: 'expense', icon: 'hand-heart', color: accentPalette[9] },
  { name: 'Investimentos', kind: 'expense', icon: 'piggy-bank', color: accentPalette[0] },
  { name: 'Vendas', kind: 'income', icon: 'store', color: accentPalette[4] },
];

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
  ...addedInV2.filter((c) => c.kind === 'expense'),
  { name: 'Outros', kind: 'expense', icon: 'circle-ellipsis', color: accentPalette[8] },
  { name: 'Salário', kind: 'income', icon: 'briefcase', color: accentPalette[5] },
  { name: 'Freelance', kind: 'income', icon: 'laptop', color: accentPalette[0] },
  { name: 'Rendimentos', kind: 'income', icon: 'trending-up', color: accentPalette[6] },
  { name: 'Reembolso', kind: 'income', icon: 'undo-2', color: accentPalette[7] },
  { name: 'Presente', kind: 'income', icon: 'gift', color: accentPalette[2] },
  ...addedInV2.filter((c) => c.kind === 'income'),
  { name: 'Outros', kind: 'income', icon: 'circle-ellipsis', color: accentPalette[8] },
];

export function buildDefaultCategories(
  timestamp = nowTimestamp(),
  makeId = newId,
  list: readonly DefaultCategory[] = defaultCategories,
): Category[] {
  return list.map((c) => ({
    ...c,
    id: makeId(),
    parentId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }));
}

/**
 * Categorias de `addedInV2` que faltam para quem já tinha categorias. Se alguma delas já
 * existe (mesmo nome e tipo, inclusive excluída), o lote já foi aplicado antes, ou a pessoa
 * criou/excluiu por conta própria: não mexe em nada, para nunca recriar o que foi apagado.
 */
export function missingV2Categories(
  existing: readonly Pick<Category, 'name' | 'kind'>[],
): DefaultCategory[] {
  const key = (c: Pick<Category, 'name' | 'kind'>) => `${c.kind}:${c.name.trim().toLowerCase()}`;
  const keys = new Set(existing.map(key));
  if (addedInV2.some((c) => keys.has(key(c)))) return [];
  return [...addedInV2];
}

/**
 * Cria as categorias padrão se a tabela estiver vazia; senão, acrescenta uma vez as
 * categorias novas da v2. Idempotente.
 */
export async function seedDefaultCategories(db: AppDatabase): Promise<void> {
  const existing = await db
    .select({ name: categories.name, kind: categories.kind })
    .from(categories);
  const list = existing.length === 0 ? defaultCategories : missingV2Categories(existing);
  if (list.length === 0) return;
  await db.insert(categories).values(buildDefaultCategories(nowTimestamp(), newId, list));
}
