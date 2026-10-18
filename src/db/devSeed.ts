/**
 * Dados de exemplo para telas e demos (só desenvolvimento): 3 contas, 2 cartões e
 * 3 meses de lançamentos realistas até `today`, com parcelas, transferência, estorno,
 * ajuste, faturas pagas, parcial, fechada e aberta, e um lançamento futuro.
 *
 * `buildDevSeed` é puro e determinístico (mesma entrada → mesmos dados); `runDevSeed`
 * grava no banco.
 */
import { installmentCycles, type InvoiceCycle } from '@/domain/invoices/cycle';
import type {
  Account,
  Category,
  CreditCard,
  Id,
  Invoice,
  ISODate,
  Timestamp,
  Transaction,
} from '@/domain/types';
import { addMonths, compareDates, dateInMonth, monthOf, parseISODate } from '@/lib/dates';
import { newId, nowTimestamp } from '@/lib/id';
import { splitInstallments, sumCents } from '@/lib/money';
import { accentPalette } from '@/ui/tokens';

import type { AppDatabase } from './database';
import { listCategories } from './repositories/categories';
import { accounts, creditCards, invoices, transactions } from './schema';

export type DevSeed = {
  accounts: Account[];
  creditCards: CreditCard[];
  invoices: Invoice[];
  transactions: Transaction[];
};

export type DevSeedOptions = {
  today: ISODate;
  categories: readonly Category[];
  makeId?: () => Id;
  now?: Timestamp;
};

/** Gerador pseudoaleatório com semente (mulberry32), para dados reproduzíveis. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Inteiro em [min, max]. */
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  /** Valor em centavos arredondado a 10 centavos. */
  const cents = (min: number, max: number) => Math.round(int(min, max) / 10) * 10;
  const pick = <T>(items: readonly T[]) => items[int(0, items.length - 1)];
  return { int, cents, pick };
}

export function buildDevSeed({
  today,
  categories,
  makeId = newId,
  now = nowTimestamp(),
}: DevSeedOptions): DevSeed {
  const random = createRandom(parseISODate(today).day + 2026);
  const entity = () => ({ id: makeId(), createdAt: now, updatedAt: now, deletedAt: null });

  const category = (name: string, kind: Category['kind'] = 'expense'): Id => {
    const found = categories.find((c) => c.name === name && c.kind === kind);
    if (!found) throw new Error(`Categoria padrão ausente: ${name}`);
    return found.id;
  };

  const nubank: Account = {
    ...entity(),
    name: 'Nubank',
    type: 'checking',
    institution: 'Nubank',
    color: accentPalette[1],
    icon: 'NU',
    initialBalanceCents: 250000,
    archivedAt: null,
  };
  const inter: Account = {
    ...entity(),
    name: 'Inter',
    type: 'checking',
    institution: 'Banco Inter',
    color: accentPalette[3],
    icon: 'IN',
    initialBalanceCents: 120000,
    archivedAt: null,
  };
  const wallet: Account = {
    ...entity(),
    name: 'Carteira',
    type: 'cash',
    institution: 'Dinheiro',
    color: accentPalette[8],
    icon: 'DI',
    initialBalanceCents: 15000,
    archivedAt: null,
  };

  const roxinho: CreditCard = {
    ...entity(),
    name: 'Nubank Roxinho',
    institution: 'Nubank',
    color: accentPalette[1],
    limitCents: 800000,
    closingDay: 3,
    dueDay: 10,
    paymentAccountId: nubank.id,
    archivedAt: null,
  };
  const gold: CreditCard = {
    ...entity(),
    name: 'Inter Gold',
    institution: 'Banco Inter',
    color: accentPalette[3],
    limitCents: 450000,
    closingDay: 25,
    dueDay: 5,
    paymentAccountId: inter.id,
    archivedAt: null,
  };

  const txs: Transaction[] = [];
  const invoiceByKey = new Map<string, Invoice>();

  const base = (date: ISODate) =>
    ({
      ...entity(),
      date,
      direction: null,
      categoryId: null,
      accountId: null,
      cardId: null,
      invoiceId: null,
      transferPeerId: null,
      refundOfId: null,
      installmentGroupId: null,
      installmentNumber: null,
      installmentTotal: null,
      status: compareDates(date, today) <= 0 ? 'posted' : 'scheduled',
      source: 'manual',
      notes: null,
    }) satisfies Partial<Transaction>;

  const invoiceFor = (card: CreditCard, cycle: InvoiceCycle): Invoice => {
    const key = `${card.id}:${cycle.referenceMonth}`;
    let invoice = invoiceByKey.get(key);
    if (!invoice) {
      invoice = { ...entity(), cardId: card.id, ...cycle, status: 'open' };
      invoiceByKey.set(key, invoice);
    }
    return invoice;
  };

  const accountTx = (
    kind: 'income' | 'expense',
    account: Account,
    date: ISODate,
    amountCents: number,
    description: string,
    categoryId: Id,
  ) => {
    txs.push({ ...base(date), kind, accountId: account.id, amountCents, description, categoryId });
  };

  /** Compra no cartão em N parcelas: a parcela i tem data i meses depois da compra. */
  const cardPurchase = (
    card: CreditCard,
    date: ISODate,
    totalCents: number,
    description: string,
    categoryId: Id,
    installments = 1,
  ) => {
    const cycles = installmentCycles(card, date, installments);
    const amounts = splitInstallments(totalCents, installments);
    const groupId = installments > 1 ? makeId() : null;
    const { day } = parseISODate(date);
    cycles.forEach((cycle, i) => {
      txs.push({
        ...base(dateInMonth(addMonths(monthOf(date), i), day)),
        status: 'posted',
        kind: 'card_purchase',
        cardId: card.id,
        invoiceId: invoiceFor(card, cycle).id,
        amountCents: amounts[i],
        description,
        categoryId,
        installmentGroupId: groupId,
        installmentNumber: groupId ? i + 1 : null,
        installmentTotal: groupId ? installments : null,
      });
    });
  };

  const currentMonth = monthOf(today);
  const months = [addMonths(currentMonth, -2), addMonths(currentMonth, -1), currentMonth];
  const isPast = (date: ISODate) => compareDates(date, today) <= 0;

  months.forEach((month, index) => {
    const on = (day: number) => dateInMonth(month, day);
    const ifPast = (day: number, fn: (date: ISODate) => void) => {
      if (isPast(on(day))) fn(on(day));
    };

    ifPast(5, (d) =>
      accountTx('income', nubank, d, 650000, 'Salário', category('Salário', 'income')),
    );
    if (index === 1) {
      ifPast(20, (d) =>
        accountTx('income', inter, d, 180000, 'Projeto freelance', category('Freelance', 'income')),
      );
    }
    ifPast(10, (d) => accountTx('expense', nubank, d, 180000, 'Aluguel', category('Moradia')));
    ifPast(12, (d) => accountTx('expense', inter, d, 9990, 'Internet', category('Contas')));
    ifPast(15, (d) =>
      accountTx(
        'expense',
        nubank,
        d,
        random.cents(14000, 22000),
        'Conta de luz',
        category('Contas'),
      ),
    );

    // Saque para a carteira: transferência em duas pernas.
    ifPast(6, (d) => {
      const out = {
        ...base(d),
        kind: 'transfer' as const,
        amountCents: 20000,
        description: 'Saque',
      };
      const outLeg: Transaction = { ...out, direction: 'out', accountId: nubank.id };
      const inLeg: Transaction = { ...out, ...entity(), direction: 'in', accountId: wallet.id };
      outLeg.transferPeerId = inLeg.id;
      inLeg.transferPeerId = outLeg.id;
      txs.push(outLeg, inLeg);
    });

    for (const day of [3, 11, 19, 26]) {
      ifPast(day, (d) =>
        accountTx(
          'expense',
          wallet,
          d,
          random.cents(800, 2500),
          random.pick(['Padaria', 'Feira', 'Café']),
          category('Alimentação'),
        ),
      );
    }

    ifPast(8, (d) => cardPurchase(roxinho, d, 2190, 'Spotify', category('Assinaturas')));
    ifPast(14, (d) => cardPurchase(roxinho, d, 4490, 'Netflix', category('Assinaturas')));

    for (const day of [2, 9, 16, 23]) {
      ifPast(day, (d) =>
        cardPurchase(
          gold,
          d,
          random.cents(18000, 46000),
          random.pick(['Supermercado Dia', 'Atacadão', 'Hortifruti']),
          category('Mercado'),
        ),
      );
    }

    for (let i = 0; i < 6; i++) {
      ifPast(random.int(1, 28), (d) =>
        cardPurchase(
          roxinho,
          d,
          random.cents(2500, 9500),
          random.pick(['iFood', 'Restaurante Sabor', 'Lanchonete', 'Pizzaria']),
          category('Alimentação'),
        ),
      );
    }
    for (let i = 0; i < 4; i++) {
      ifPast(random.int(1, 28), (d) =>
        cardPurchase(roxinho, d, random.cents(1800, 4500), 'Uber', category('Transporte')),
      );
    }

    if (index === 0) {
      ifPast(18, (d) => cardPurchase(roxinho, d, 459000, 'Notebook', category('Compras'), 10));
    }
    if (index === 1) {
      ifPast(22, (d) => cardPurchase(gold, d, 120000, 'Passagem aérea', category('Viagem'), 3));
      // Estorno de parte de uma compra no mercado, na mesma fatura.
      ifPast(24, (d) => {
        const invoice = invoiceFor(gold, installmentCycles(gold, d, 1)[0]);
        txs.push({
          ...base(d),
          kind: 'adjustment',
          direction: 'in',
          cardId: gold.id,
          invoiceId: invoice.id,
          amountCents: 3500,
          description: 'Estorno Atacadão',
          categoryId: category('Mercado'),
        });
      });
    }
    if (index === 2) {
      // Correção do saldo da carteira, preservando o histórico.
      ifPast(1, (d) =>
        txs.push({
          ...base(d),
          kind: 'adjustment',
          direction: 'out',
          accountId: wallet.id,
          amountCents: 1350,
          description: 'Ajuste de saldo',
        }),
      );
    }
  });

  // Lançamento futuro: aluguel do mês que vem, ainda previsto.
  txs.push({
    ...base(dateInMonth(addMonths(currentMonth, 1), 10)),
    kind: 'expense',
    accountId: nubank.id,
    amountCents: 180000,
    description: 'Aluguel',
    categoryId: category('Moradia'),
  });

  // Faturas vencidas são pagas pela conta do cartão; a última vencida do Inter Gold, só em parte.
  const invoiceList = [...invoiceByKey.values()].sort((a, b) => compareDates(a.dueDate, b.dueDate));
  const lastDueGold = invoiceList.filter((i) => i.cardId === gold.id && isPast(i.dueDate)).at(-1);

  for (const invoice of invoiceList) {
    const card = invoice.cardId === roxinho.id ? roxinho : gold;
    if (isPast(invoice.dueDate)) {
      const totalCents = sumCents(
        txs
          .filter((t) => t.invoiceId === invoice.id)
          .map((t) =>
            t.kind === 'adjustment' && t.direction === 'in' ? -t.amountCents : t.amountCents,
          ),
      );
      const partial = invoice === lastDueGold;
      const paidCents = partial ? Math.round(totalCents * 0.7) : totalCents;
      invoice.status = partial ? 'partial' : 'paid';
      txs.push({
        ...base(invoice.dueDate),
        kind: 'invoice_payment',
        accountId: card.paymentAccountId,
        cardId: card.id,
        invoiceId: invoice.id,
        amountCents: paidCents,
        description: `Pagamento fatura ${card.name}`,
      });
    } else if (isPast(invoice.closingDate)) {
      invoice.status = 'closed';
    }
  }

  return {
    accounts: [nubank, inter, wallet],
    creditCards: [roxinho, gold],
    invoices: invoiceList,
    transactions: txs.sort((a, b) => compareDates(a.date, b.date)),
  };
}

const CHUNK = 50;

/** Apaga contas, cartões, faturas e lançamentos (as categorias ficam). Só desenvolvimento. */
export async function clearDevData(db: AppDatabase): Promise<void> {
  await db.delete(transactions);
  await db.delete(invoices);
  await db.delete(creditCards);
  await db.delete(accounts);
}

/** Substitui os dados atuais pelos dados de exemplo. Só desenvolvimento. */
export async function runDevSeed(db: AppDatabase, today: ISODate): Promise<DevSeed> {
  const seed = buildDevSeed({ today, categories: await listCategories(db) });
  await clearDevData(db);
  await db.insert(accounts).values(seed.accounts);
  await db.insert(creditCards).values(seed.creditCards);
  await db.insert(invoices).values(seed.invoices);
  for (let i = 0; i < seed.transactions.length; i += CHUNK) {
    await db.insert(transactions).values(seed.transactions.slice(i, i + CHUNK));
  }
  return seed;
}
