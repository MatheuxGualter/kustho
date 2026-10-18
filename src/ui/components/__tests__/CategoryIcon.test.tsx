import { defaultCategories } from '@/db/seed';

import { categoryIconGroups, categoryIcons } from '../CategoryIcon';

describe('ícones de categoria', () => {
  it('cobrem os ícones das categorias padrão', () => {
    for (const c of defaultCategories) expect(categoryIcons[c.icon]).toBeDefined();
  });

  it('cada ícone aparece em um grupo só', () => {
    const names = Object.values(categoryIconGroups).flatMap((g) => Object.keys(g));
    expect(new Set(names).size).toBe(names.length);
  });
});
