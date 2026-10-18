import { eq } from 'drizzle-orm';

import { addedInV2, defaultCategories, missingV2Categories, seedDefaultCategories } from '../seed';
import { categories } from '../schema';
import { createTestDb } from '../test/testDb';

const v1 = defaultCategories.filter((c) => !addedInV2.includes(c));

describe('seedDefaultCategories', () => {
  it('cria todas as categorias padrão num banco vazio, uma vez só', async () => {
    const { db } = createTestDb();
    await seedDefaultCategories(db);
    await seedDefaultCategories(db);
    expect(await db.select().from(categories)).toHaveLength(defaultCategories.length);
  });

  it('acrescenta as categorias da v2 para quem já tinha as da v1', async () => {
    const { db } = createTestDb();
    await db.insert(categories).values(
      v1.map((c, i) => ({
        ...c,
        id: `v1-${i}`,
        parentId: null,
        createdAt: 'now',
        updatedAt: 'now',
        deletedAt: null,
      })),
    );
    await seedDefaultCategories(db);
    await seedDefaultCategories(db);
    const names = (await db.select().from(categories)).map((c) => `${c.kind}:${c.name}`);
    expect(names).toHaveLength(defaultCategories.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('não recria uma categoria nova que a pessoa excluiu', async () => {
    const { db } = createTestDb();
    await seedDefaultCategories(db);
    await db
      .update(categories)
      .set({ deletedAt: 'now' })
      .where(eq(categories.name, addedInV2[0].name));
    await seedDefaultCategories(db);
    const rows = await db.select().from(categories).where(eq(categories.name, addedInV2[0].name));
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).toBe('now');
  });
});

describe('missingV2Categories', () => {
  it('devolve o lote inteiro quando nenhuma delas existe', () => {
    expect(missingV2Categories(v1)).toEqual(addedInV2);
  });

  it('não devolve nada se alguma já existe (ignora maiúsculas e espaços)', () => {
    const [first] = addedInV2;
    expect(
      missingV2Categories([...v1, { ...first, name: ` ${first.name.toUpperCase()} ` }]),
    ).toEqual([]);
  });

  it('nome igual em outro tipo não conta', () => {
    const [first] = addedInV2;
    const otherKind = first.kind === 'expense' ? 'income' : 'expense';
    expect(missingV2Categories([{ name: first.name, kind: otherKind }])).toEqual(addedInV2);
  });
});
