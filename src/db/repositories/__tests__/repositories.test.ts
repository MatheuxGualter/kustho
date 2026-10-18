import { cycleForPurchase } from '@/domain/invoices/cycle';

import { createTestDb } from '../../test/testDb';
import {
  createAccount,
  getAccount,
  listAccounts,
  setAccountArchived,
  setAccountDeleted,
  updateAccount,
} from '../accounts';
import { createCard, listCards, setCardArchived } from '../cards';
import { createCategory, listCategories, setCategoryDeleted } from '../categories';
import { getOrCreateInvoice, listInvoices, setInvoiceStatus } from '../invoices';
import {
  getTransaction,
  insertTransactions,
  listInvoiceTransactions,
  listTransactionsBetween,
  setTransactionDeleted,
  type TransactionInput,
} from '../transactions';

const accountInput = {
  name: 'Conta Nubank',
  type: 'checking' as const,
  institution: 'Nubank',
  color: '#7C3AED',
  icon: 'NU',
  initialBalanceCents: 100000,
};

const cardInput = {
  name: 'Cartão Nubank',
  institution: 'Nubank',
  color: '#7C3AED',
  limitCents: 800000,
  closingDay: 3,
  dueDay: 10,
  paymentAccountId: null,
};

function expense(accountId: string, overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    kind: 'expense',
    amountCents: 4590,
    direction: null,
    date: '2026-10-17',
    description: 'Almoço',
    categoryId: null,
    accountId,
    cardId: null,
    invoiceId: null,
    transferPeerId: null,
    refundOfId: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    status: 'posted',
    source: 'manual',
    notes: null,
    ...overrides,
  };
}

describe('contas', () => {
  it('cria com ID e timestamps, e lê de volta', async () => {
    const { db } = createTestDb();
    const created = await createAccount(db, accountInput);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBe(created.updatedAt);
    expect(await getAccount(db, created.id)).toEqual(created);
  });

  it('lista em ordem alfabética, sem arquivadas por padrão', async () => {
    const { db } = createTestDb();
    const b = await createAccount(db, { ...accountInput, name: 'B' });
    await createAccount(db, { ...accountInput, name: 'A' });
    await setAccountArchived(db, b.id, true);
    expect((await listAccounts(db)).map((a) => a.name)).toEqual(['A']);
    expect((await listAccounts(db, { includeArchived: true })).map((a) => a.name)).toEqual([
      'A',
      'B',
    ]);
  });

  it('exclusão lógica pode ser desfeita', async () => {
    const { db } = createTestDb();
    const account = await createAccount(db, accountInput);
    await setAccountDeleted(db, account.id, true);
    expect(await getAccount(db, account.id)).toBeUndefined();
    expect(await listAccounts(db, { includeArchived: true })).toEqual([]);
    await setAccountDeleted(db, account.id, false);
    expect(await getAccount(db, account.id)).toBeDefined();
  });

  it('edição atualiza updatedAt', async () => {
    const { db } = createTestDb();
    const account = await createAccount(db, accountInput);
    await new Promise((r) => setTimeout(r, 2));
    await updateAccount(db, account.id, { name: 'Conta principal' });
    const updated = await getAccount(db, account.id);
    expect(updated?.name).toBe('Conta principal');
    expect(updated!.updatedAt > account.updatedAt).toBe(true);
  });
});

describe('cartões e faturas', () => {
  it('lista cartões ativos', async () => {
    const { db } = createTestDb();
    const card = await createCard(db, cardInput);
    expect(await listCards(db)).toHaveLength(1);
    await setCardArchived(db, card.id, true);
    expect(await listCards(db)).toHaveLength(0);
  });

  it('getOrCreateInvoice não duplica a fatura do mesmo mês', async () => {
    const { db } = createTestDb();
    const card = await createCard(db, cardInput);
    const cycle = cycleForPurchase(card, '2026-10-20');
    const first = await getOrCreateInvoice(db, card.id, cycle);
    const second = await getOrCreateInvoice(db, card.id, cycle);
    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({ referenceMonth: '2026-11', status: 'open' });
    await setInvoiceStatus(db, first.id, 'closed');
    expect((await listInvoices(db, card.id))[0].status).toBe('closed');
  });

  it('lista os lançamentos de uma fatura', async () => {
    const { db } = createTestDb();
    const card = await createCard(db, cardInput);
    const invoice = await getOrCreateInvoice(db, card.id, cycleForPurchase(card, '2026-10-20'));
    await insertTransactions(db, [
      {
        ...expense('unused'),
        kind: 'card_purchase',
        accountId: null,
        cardId: card.id,
        invoiceId: invoice.id,
        date: '2026-10-20',
      },
    ]);
    expect(await listInvoiceTransactions(db, invoice.id)).toHaveLength(1);
  });
});

describe('categorias', () => {
  it('filtra por tipo e esconde excluídas', async () => {
    const { db } = createTestDb();
    const base = { icon: 'tag', color: '#0F766E', parentId: null };
    const food = await createCategory(db, { ...base, name: 'Comida', kind: 'expense' });
    await createCategory(db, { ...base, name: 'Salário', kind: 'income' });
    expect((await listCategories(db, 'expense')).map((c) => c.name)).toEqual(['Comida']);
    await setCategoryDeleted(db, food.id, true);
    expect(await listCategories(db, 'expense')).toEqual([]);
    expect(await listCategories(db)).toHaveLength(1);
  });
});

describe('lançamentos', () => {
  it('lista por período, do mais recente ao mais antigo', async () => {
    const { db } = createTestDb();
    const account = await createAccount(db, accountInput);
    await insertTransactions(db, [
      expense(account.id, { date: '2026-09-30', description: 'fora' }),
      expense(account.id, { date: '2026-10-01', description: 'primeiro' }),
      expense(account.id, { date: '2026-10-31', description: 'último' }),
    ]);
    const rows = await listTransactionsBetween(db, '2026-10-01', '2026-10-31');
    expect(rows.map((t) => t.description)).toEqual(['último', 'primeiro']);
  });

  it('exclusão lógica some da lista e pode ser desfeita', async () => {
    const { db } = createTestDb();
    const account = await createAccount(db, accountInput);
    const [tx] = await insertTransactions(db, [expense(account.id)]);
    await setTransactionDeleted(db, tx.id, true);
    expect(await getTransaction(db, tx.id)).toBeUndefined();
    await setTransactionDeleted(db, tx.id, false);
    expect(await getTransaction(db, tx.id)).toEqual({ ...tx, updatedAt: expect.any(String) });
  });

  it('o banco recusa lançamento inválido', async () => {
    const { db } = createTestDb();
    const account = await createAccount(db, accountInput);
    await expect(
      insertTransactions(db, [expense(account.id, { kind: 'transfer', direction: null })]),
    ).rejects.toThrow();
    await expect(insertTransactions(db, [expense('conta-inexistente')])).rejects.toThrow();
  });
});
