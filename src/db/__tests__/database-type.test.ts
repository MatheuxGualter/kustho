import type { AppDatabase } from '../database';
import type { db } from '../client';

// Falha no typecheck se o banco do app deixar de ser aceito pelos repositórios.
const appDbIsAccepted: (d: typeof db) => AppDatabase = (d) => d;

it('o banco do app é um AppDatabase', () => {
  expect(appDbIsAccepted).toBeDefined();
});
