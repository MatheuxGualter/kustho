/**
 * Schema do SQLite local (fonte de verdade). Arquivo de alto conflito: só muda no
 * kickoff da fase ou pelo responsável definido nele. Depois de alterar, rode
 * `pnpm db:generate` e faça o commit da migração gerada junto.
 *
 * Os tipos inferidos daqui são conferidos contra `src/domain/types.ts` em
 * `src/db/__tests__/schema-contract.test.ts`.
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  accountTypes,
  categoryKinds,
  invoiceStatuses,
  transactionKinds,
  transactionSources,
  transactionStatuses,
} from '@/domain/types';

const entity = {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

export const accounts = sqliteTable('accounts', {
  ...entity,
  name: text('name').notNull(),
  type: text('type', { enum: accountTypes }).notNull(),
  institution: text('institution').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  initialBalanceCents: integer('initial_balance_cents').notNull().default(0),
  archivedAt: text('archived_at'),
});

export const creditCards = sqliteTable(
  'credit_cards',
  {
    ...entity,
    name: text('name').notNull(),
    institution: text('institution').notNull(),
    color: text('color').notNull(),
    limitCents: integer('limit_cents').notNull(),
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    paymentAccountId: text('payment_account_id').references(() => accounts.id),
    archivedAt: text('archived_at'),
  },
  (t) => [
    check('credit_cards_closing_day', sql`${t.closingDay} BETWEEN 1 AND 31`),
    check('credit_cards_due_day', sql`${t.dueDay} BETWEEN 1 AND 31`),
    check('credit_cards_limit', sql`${t.limitCents} >= 0`),
  ],
);

export const categories = sqliteTable(
  'categories',
  {
    ...entity,
    name: text('name').notNull(),
    kind: text('kind', { enum: categoryKinds }).notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    parentId: text('parent_id'),
  },
  (t) => [index('categories_parent_idx').on(t.parentId)],
);

export const invoices = sqliteTable(
  'invoices',
  {
    ...entity,
    cardId: text('card_id')
      .notNull()
      .references(() => creditCards.id),
    referenceMonth: text('reference_month').notNull(),
    closingDate: text('closing_date').notNull(),
    dueDate: text('due_date').notNull(),
    status: text('status', { enum: invoiceStatuses }).notNull().default('open'),
  },
  (t) => [uniqueIndex('invoices_card_month_uq').on(t.cardId, t.referenceMonth)],
);

export const transactions = sqliteTable(
  'transactions',
  {
    ...entity,
    kind: text('kind', { enum: transactionKinds }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    direction: text('direction', { enum: ['in', 'out'] }),
    date: text('date').notNull(),
    description: text('description').notNull(),
    categoryId: text('category_id').references(() => categories.id),
    accountId: text('account_id').references(() => accounts.id),
    cardId: text('card_id').references(() => creditCards.id),
    invoiceId: text('invoice_id').references(() => invoices.id),
    transferPeerId: text('transfer_peer_id'),
    installmentGroupId: text('installment_group_id'),
    installmentNumber: integer('installment_number'),
    installmentTotal: integer('installment_total'),
    status: text('status', { enum: transactionStatuses }).notNull().default('posted'),
    source: text('source', { enum: transactionSources }).notNull().default('manual'),
    notes: text('notes'),
  },
  (t) => [
    index('transactions_date_idx').on(t.date),
    index('transactions_account_idx').on(t.accountId),
    index('transactions_card_idx').on(t.cardId),
    index('transactions_invoice_idx').on(t.invoiceId),
    index('transactions_installment_group_idx').on(t.installmentGroupId),
    check('transactions_amount_positive', sql`${t.amountCents} > 0`),
    // `direction` é obrigatório em transferências e ajustes, e proibido nos demais tipos.
    check(
      'transactions_direction',
      sql`(${t.kind} IN ('transfer', 'adjustment')) = (${t.direction} IS NOT NULL)`,
    ),
    // Toda transação pertence a uma conta ou a um cartão.
    check('transactions_owner', sql`${t.accountId} IS NOT NULL OR ${t.cardId} IS NOT NULL`),
  ],
);
