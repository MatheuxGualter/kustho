/**
 * Schema do SQLite local (fonte de verdade). Arquivo de alto conflito: só muda no
 * kickoff da fase ou pelo responsável definido nele. Depois de alterar, rode
 * `pnpm db:generate` e faça o commit da migração gerada junto.
 *
 * Os tipos inferidos daqui são conferidos contra `src/domain/types.ts` em
 * `src/db/__tests__/schema-contract.test.ts`.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import {
  accountTypes,
  captureChannels,
  captureKinds,
  captureStatuses,
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
    refundOfId: text('refund_of_id'),
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
    index('transactions_refund_of_idx').on(t.refundOfId),
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

// ─── Fase 2 ──────────────────────────────────────────────────────────────────

export const captures = sqliteTable(
  'captures',
  {
    ...entity,
    rawId: text('raw_id').notNull(),
    packageName: text('package_name').notNull(),
    title: text('title'),
    text: text('text'),
    postedAt: text('posted_at').notNull(),
    parser: text('parser'),
    amountCents: integer('amount_cents'),
    kind: text('kind', { enum: captureKinds }),
    merchant: text('merchant'),
    date: text('date'),
    cardLastDigits: text('card_last_digits'),
    suggestedAccountId: text('suggested_account_id').references(() => accounts.id),
    suggestedCardId: text('suggested_card_id').references(() => creditCards.id),
    confidence: real('confidence').notNull().default(0),
    status: text('status', { enum: captureStatuses }).notNull().default('pending'),
    transactionId: text('transaction_id').references(() => transactions.id),
    // Fase 3
    channel: text('channel', { enum: captureChannels }).notNull().default('notification'),
    suggestedCategoryId: text('suggested_category_id').references(() => categories.id),
    installments: integer('installments'),
    matchTransactionId: text('match_transaction_id').references(() => transactions.id),
    matchScore: real('match_score').notNull().default(0),
    duplicateOfId: text('duplicate_of_id'),
    editedOnConfirm: integer('edited_on_confirm', { mode: 'boolean' }).notNull().default(false),
    autoConfirmed: integer('auto_confirmed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    uniqueIndex('captures_raw_id_uq').on(t.rawId),
    index('captures_status_idx').on(t.status),
    check('captures_amount_positive', sql`${t.amountCents} IS NULL OR ${t.amountCents} > 0`),
    check('captures_confidence', sql`${t.confidence} BETWEEN 0 AND 1`),
    check(
      'captures_single_origin',
      sql`${t.suggestedAccountId} IS NULL OR ${t.suggestedCardId} IS NULL`,
    ),
    // Confirmada sempre aponta para o lançamento criado.
    check(
      'captures_confirmed_tx',
      sql`(${t.status} = 'confirmed') = (${t.transactionId} IS NOT NULL)`,
    ),
  ],
);

export const captureOriginRules = sqliteTable(
  'capture_origin_rules',
  {
    ...entity,
    packageName: text('package_name').notNull(),
    cardLastDigits: text('card_last_digits'),
    accountId: text('account_id').references(() => accounts.id),
    cardId: text('card_id').references(() => creditCards.id),
  },
  (t) => [
    index('capture_origin_rules_package_idx').on(t.packageName),
    // Exatamente uma origem: conta ou cartão.
    check(
      'capture_origin_rules_single_origin',
      sql`(${t.accountId} IS NULL) <> (${t.cardId} IS NULL)`,
    ),
  ],
);

// ─── Fase 3 ──────────────────────────────────────────────────────────────────

export const merchantRules = sqliteTable(
  'merchant_rules',
  {
    ...entity,
    merchantKey: text('merchant_key').notNull(),
    categoryId: text('category_id').references(() => categories.id),
    accountId: text('account_id').references(() => accounts.id),
    cardId: text('card_id').references(() => creditCards.id),
    hits: integer('hits').notNull().default(1),
  },
  (t) => [
    uniqueIndex('merchant_rules_key_uq').on(t.merchantKey),
    check('merchant_rules_single_origin', sql`${t.accountId} IS NULL OR ${t.cardId} IS NULL`),
  ],
);

export const captureSources = sqliteTable(
  'capture_sources',
  {
    ...entity,
    packageName: text('package_name').notNull(),
    autoConfirm: integer('auto_confirm', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [uniqueIndex('capture_sources_package_uq').on(t.packageName)],
);
