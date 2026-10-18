import { categoryKinds } from '@/domain/types';
import { accentPalette } from '@/ui/tokens';

import { buildDefaultCategories, defaultCategories } from '../seed';

jest.mock('@/lib/id', () => ({ newId: () => 'id', nowTimestamp: () => 'now' }));

describe('categorias padrão', () => {
  it('cobrem despesas e receitas', () => {
    for (const kind of categoryKinds) {
      expect(defaultCategories.some((c) => c.kind === kind)).toBe(true);
    }
  });

  it('não repetem nome dentro do mesmo tipo', () => {
    const keys = defaultCategories.map((c) => `${c.kind}:${c.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('usam só cores da paleta', () => {
    for (const c of defaultCategories) {
      expect(accentPalette).toContain(c.color);
    }
  });

  it('geram entidades completas', () => {
    let n = 0;
    const rows = buildDefaultCategories('2026-10-17T00:00:00.000Z', () => `id-${n++}`);
    expect(rows[0]).toMatchObject({
      id: 'id-0',
      parentId: null,
      deletedAt: null,
      createdAt: '2026-10-17T00:00:00.000Z',
    });
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});
