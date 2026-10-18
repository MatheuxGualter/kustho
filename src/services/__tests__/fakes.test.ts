/**
 * Testes de fumaça dos fakes ainda sem serviço real. Quando a trilha entregar o real, os
 * testes do domínio dela migram para uma suíte em `contracts/` (como contas).
 */
import { createFakeServices, createFakeStore } from '../fakes';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

const today = '2026-10-17';
const setup = () => {
  const store = createFakeStore(today);
  return { store, services: createFakeServices(store) };
};

describe('fake de categorias', () => {
  it('excluir categoria em uso exige mover os lançamentos', async () => {
    const { services, store } = setup();
    const used = store.transactions.find((t) => t.categoryId)!.categoryId!;
    const other = store.categories.find((c) => c.id !== used)!.id;
    await expect(services.categories.deleteCategory(used)).rejects.toThrow();
    await services.categories.deleteCategory(used, other);
    expect(store.transactions.some((t) => t.categoryId === used)).toBe(false);
  });
});
