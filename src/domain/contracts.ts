/**
 * Contratos dos serviços da Fase 1. Telas só falam com estes serviços (via
 * `useServices()`), nunca com repositórios ou com o banco direto.
 *
 * Arquivo de alto conflito: muda só no kickoff ou com aviso ao grupo e commit em `main`
 * antes de qualquer outra coisa. Cada trilha implementa o seu serviço em
 * `src/domain/<domínio>/service.ts`; até lá, `src/services/fakes/` cumpre o contrato.
 *
 * Todas as funções são assíncronas (o mesmo código roda com expo-sqlite e nos testes).
 * Escritas avisam as telas pela notificação de mudança (`notifyDataChanged`).
 */
import type {
  Account,
  AccountWithBalance,
  Category,
  CategoryKind,
  Cents,
  CreditCard,
  DayGroup,
  Entity,
  Id,
  Invoice,
  ISODate,
  NewCardPurchase,
  NewTransaction,
  NewTransfer,
  Transaction,
  TxFilters,
  YearMonth,
} from './types';

type EntityKeys = keyof Entity;

export type AccountInput = Omit<Account, EntityKeys | 'archivedAt'>;
export type CreditCardInput = Omit<CreditCard, EntityKeys | 'archivedAt'>;
export type CategoryInput = Omit<Category, EntityKeys>;

/** Campos editáveis de um lançamento já criado. */
export type TransactionPatch = Partial<
  Pick<
    Transaction,
    'amountCents' | 'date' | 'description' | 'categoryId' | 'accountId' | 'status' | 'notes'
  >
>;

// ─── Trilha A · Contas ───────────────────────────────────────────────────────

export interface AccountsService {
  /** Contas com saldo calculado até `until` (padrão: hoje). Sem arquivadas, salvo pedido. */
  listAccountsWithBalance(options?: {
    includeArchived?: boolean;
    until?: ISODate;
  }): Promise<AccountWithBalance[]>;
  /**
   * Regra 1: saldo inicial + receitas − despesas ± transferências ± ajustes − pagamentos
   * de fatura; só `posted`, não excluídos e com data ≤ `until`.
   */
  getAccountBalance(accountId: Id, until?: ISODate): Promise<Cents>;
  /** Regra 2: soma das contas não arquivadas. Cartões não entram. */
  getTotalBalance(until?: ISODate): Promise<Cents>;
  getAccount(id: Id): Promise<Account | undefined>;
  createAccount(input: AccountInput): Promise<Account>;
  updateAccount(id: Id, patch: Partial<AccountInput>): Promise<void>;
  setAccountArchived(id: Id, archived: boolean): Promise<void>;
  /** Só exclui conta sem lançamentos; com lançamentos, lança erro (deve ser arquivada). */
  deleteAccount(id: Id): Promise<void>;
  /** Desfaz `deleteAccount`. */
  restoreAccount(id: Id): Promise<void>;
  /** Regra 7: duas pernas ligadas por `transferPeerId` (`out` na origem, `in` no destino). */
  createTransfer(input: NewTransfer): Promise<[outLeg: Transaction, inLeg: Transaction]>;
  /**
   * Regra 8: cria um `adjustment` com a diferença até `targetBalanceCents` na data.
   * Devolve `null` se o saldo já bate.
   */
  adjustBalance(
    accountId: Id,
    targetBalanceCents: Cents,
    date: ISODate,
  ): Promise<Transaction | null>;
}

// ─── Trilha B · Lançamentos ──────────────────────────────────────────────────

export type CategoryTotal = { categoryId: Id | null; expenseCents: Cents };

export type MonthSummary = {
  month: YearMonth;
  /** Só `posted`; transferências, pagamentos de fatura e ajustes não entram. */
  incomeCents: Cents;
  /** Despesas em conta + compras no cartão com data no mês. */
  expenseCents: Cents;
  netCents: Cents;
  /** Resultado do mês somando também os `scheduled` ("saldo previsto do mês"). */
  projectedNetCents: Cents;
  /** Despesas por categoria, da maior para a menor (rosca da Início). */
  expensesByCategory: CategoryTotal[];
};

export interface TransactionsService {
  /** Receita ou despesa em conta. Compras no cartão vão por `CardsService`. */
  createTransaction(input: NewTransaction): Promise<Transaction>;
  updateTransaction(id: Id, patch: TransactionPatch): Promise<void>;
  /**
   * Exclusão lógica. Leva junto a outra perna da transferência e as parcelas do mesmo
   * grupo. Devolve os IDs afetados, para o "Desfazer".
   */
  deleteTransaction(id: Id): Promise<Id[]>;
  restoreTransactions(ids: Id[]): Promise<void>;
  getTransaction(id: Id): Promise<Transaction | undefined>;
  /** Lançamentos do mês agrupados por dia, do mais recente ao mais antigo. */
  listMonthTransactions(month: YearMonth, filters?: TxFilters): Promise<DayGroup[]>;
  listRecentTransactions(limit: number): Promise<Transaction[]>;
  getMonthSummary(month: YearMonth): Promise<MonthSummary>;
  /** `scheduled` com data ≤ `today`, para perguntar se foram efetivados. */
  listDueScheduled(today: ISODate): Promise<Transaction[]>;
  /** Marca um lançamento previsto como efetivado (`posted`). */
  confirmScheduled(id: Id): Promise<void>;
}

// ─── Trilha C · Cartões e faturas ────────────────────────────────────────────

/** Fatura com totais; `status` é recalculado na leitura (regra 6). */
export type InvoiceWithTotals = Invoice & {
  /** Compras − estornos da fatura. */
  totalCents: Cents;
  paidCents: Cents;
  /** `totalCents − paidCents`, nunca negativo. */
  remainingCents: Cents;
};

export type CardWithSummary = CreditCard & {
  /** Fatura em que cai uma compra feita hoje. */
  currentInvoice: InvoiceWithTotals | null;
  /** Regra 5. */
  availableLimitCents: Cents;
};

export interface CardsService {
  listCardsWithSummary(options?: {
    includeArchived?: boolean;
    today?: ISODate;
  }): Promise<CardWithSummary[]>;
  getCard(id: Id): Promise<CreditCard | undefined>;
  createCard(input: CreditCardInput): Promise<CreditCard>;
  updateCard(id: Id, patch: Partial<CreditCardInput>): Promise<void>;
  setCardArchived(id: Id, archived: boolean): Promise<void>;
  /** Só exclui cartão sem lançamentos; com lançamentos, lança erro (deve ser arquivado). */
  deleteCard(id: Id): Promise<void>;
  /** Desfaz `deleteCard`. */
  restoreCard(id: Id): Promise<void>;
  /** Regra 3: fatura em que cai uma compra nessa data (cria se ainda não existir). */
  resolveInvoice(cardId: Id, purchaseDate: ISODate): Promise<Invoice>;
  /** Regra 4: N transações ligadas por `installmentGroupId`, uma em cada fatura seguinte. */
  createCardPurchase(input: NewCardPurchase): Promise<Transaction[]>;
  /** Estorno: crédito na fatura da compra, ou na aberta se aquela já fechou. */
  refundCardPurchase(transactionId: Id, amountCents: Cents, date: ISODate): Promise<Transaction>;
  listInvoices(cardId: Id): Promise<InvoiceWithTotals[]>;
  getInvoice(invoiceId: Id): Promise<InvoiceWithTotals | undefined>;
  listInvoiceTransactions(invoiceId: Id): Promise<Transaction[]>;
  /** Regra 6: `invoice_payment` que debita a conta; pagamento parcial deixa `partial`. */
  payInvoice(invoiceId: Id, accountId: Id, amountCents: Cents, date: ISODate): Promise<Transaction>;
  /** Regra 5: limite − faturas não pagas, incluindo parcelas futuras. */
  getAvailableLimit(cardId: Id): Promise<Cents>;
}

// ─── Trilha D · Categorias ───────────────────────────────────────────────────

export interface CategoriesService {
  listCategories(kind?: CategoryKind): Promise<Category[]>;
  createCategory(input: CategoryInput): Promise<Category>;
  updateCategory(id: Id, patch: Partial<CategoryInput>): Promise<void>;
  /** Categoria com lançamentos exige `moveTo`: os lançamentos passam para ela antes. */
  deleteCategory(id: Id, moveTo?: Id): Promise<void>;
}

export type Services = {
  accounts: AccountsService;
  transactions: TransactionsService;
  cards: CardsService;
  categories: CategoriesService;
};
