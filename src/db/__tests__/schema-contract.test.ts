/**
 * Garante em tempo de compilação (`pnpm typecheck`) que o schema do Drizzle e os
 * contratos de `src/domain/types.ts` descrevem as mesmas linhas.
 */
import type {
  Account,
  Capture,
  CaptureOriginRule,
  Category,
  CreditCard,
  Invoice,
  Transaction,
} from '@/domain/types';

import type {
  accounts,
  captureOriginRules,
  captures,
  categories,
  creditCards,
  invoices,
  transactions,
} from '../schema';

/** Mesmas chaves e tipos atribuíveis nos dois sentidos. */
type Equals<A, B> = [keyof A, keyof B] extends [keyof B, keyof A]
  ? [A, B] extends [B, A]
    ? true
    : false
  : false;

const contracts: [
  Equals<typeof accounts.$inferSelect, Account>,
  Equals<typeof creditCards.$inferSelect, CreditCard>,
  Equals<typeof categories.$inferSelect, Category>,
  Equals<typeof invoices.$inferSelect, Invoice>,
  Equals<typeof transactions.$inferSelect, Transaction>,
  Equals<typeof captures.$inferSelect, Capture>,
  Equals<typeof captureOriginRules.$inferSelect, CaptureOriginRule>,
] = [true, true, true, true, true, true, true];

it('schema e tipos de domínio estão alinhados', () => {
  expect(contracts.every(Boolean)).toBe(true);
});
