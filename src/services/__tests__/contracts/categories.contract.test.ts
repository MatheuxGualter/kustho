/** Contrato de CategoriesService: roda igual no fake e no serviço real. */
import { isDomainError } from '@/domain/errors';

import { environments } from './setup';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

describe.each(environments)('CategoriesService ($name)', ({ create }) => {
  it('lista as categorias padrão por tipo, em ordem alfabética', async () => {
    const { services } = await create();
    const expense = await services.categories.listCategories('expense');
    const income = await services.categories.listCategories('income');
    expect(expense.length).toBe(23);
    expect(income.length).toBe(7);
    expect(expense.every((c) => c.kind === 'expense')).toBe(true);
    const names = expense.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it('cria, edita e recusa nome repetido no mesmo tipo', async () => {
    const { services } = await create();
    const created = await services.categories.createCategory({
      name: ' Natação ',
      kind: 'expense',
      icon: 'heart-pulse',
      color: '#DB2777',
      parentId: null,
    });
    expect(created.name).toBe('Natação');
    const error = await services.categories
      .createCategory({
        name: 'mercado',
        kind: 'expense',
        icon: 'tag',
        color: '#000000',
        parentId: null,
      })
      .catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('duplicate_name');
    await services.categories.updateCategory(created.id, { name: 'Esportes' });
    const list = await services.categories.listCategories('expense');
    expect(list.some((c) => c.name === 'Esportes')).toBe(true);
  });

  it('excluir categoria em uso exige mover os lançamentos', async () => {
    const { services, seed } = await create();
    const usedId = seed.transactions.find((t) => t.categoryId)!.categoryId!;
    const usage = await services.categories.countUsage(usedId);
    expect(usage).toBeGreaterThan(0);
    const [other] = (await services.categories.listCategories()).filter((c) => c.id !== usedId);

    const error = await services.categories.deleteCategory(usedId).catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('category_in_use');

    const before = await services.categories.countUsage(other.id);
    await services.categories.deleteCategory(usedId, other.id);
    expect(await services.categories.countUsage(other.id)).toBe(before + usage);
    expect((await services.categories.listCategories()).some((c) => c.id === usedId)).toBe(false);
    await services.categories.restoreCategory(usedId);
    expect((await services.categories.listCategories()).some((c) => c.id === usedId)).toBe(true);
  });
});

describe.each(environments)('exportação ($name)', ({ create }) => {
  it('listAllTransactions traz tudo do mais antigo ao mais recente', async () => {
    const { services, seed } = await create();
    const all = await services.transactions.listAllTransactions();
    expect(all).toHaveLength(seed.transactions.length);
    const dates = all.map((t) => t.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
