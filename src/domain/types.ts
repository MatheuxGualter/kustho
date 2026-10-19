/**
 * Contratos de domínio da Fase 1. Mudou algo aqui? Avise o grupo e faça o commit
 * em `main` antes de qualquer outra coisa (ver docs/plano.md, "Como trabalhar em paralelo").
 *
 * Convenções: dinheiro em centavos inteiros, datas locais `YYYY-MM-DD`,
 * meses `YYYY-MM`, timestamps ISO 8601 e IDs UUID v4 gerados no aparelho.
 */
import type { ISODate, YearMonth } from '@/lib/dates';
import type { Cents } from '@/lib/money';

export type { Cents, ISODate, YearMonth };

/** UUID v4 gerado no aparelho (`expo-crypto`). */
export type Id = string;
/** Timestamp ISO 8601 de criação/alteração (ex.: `2026-10-17T14:03:00.000Z`). */
export type Timestamp = string;

/** Campos comuns a toda tabela; `deletedAt` é a exclusão lógica (permite desfazer e sincronizar). */
export type Entity = {
  id: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
};

// ─── Contas ──────────────────────────────────────────────────────────────────

export const accountTypes = ['checking', 'savings', 'digital_wallet', 'cash'] as const;
/** Corrente, poupança, carteira digital ou dinheiro. */
export type AccountType = (typeof accountTypes)[number];

export type Account = Entity & {
  name: string;
  type: AccountType;
  institution: string;
  /** Uma das cores de `accentPalette`. */
  color: string;
  icon: string;
  initialBalanceCents: Cents;
  archivedAt: Timestamp | null;
};

export type AccountWithBalance = Account & { balanceCents: Cents };

// ─── Cartões ─────────────────────────────────────────────────────────────────

export type CreditCard = Entity & {
  name: string;
  institution: string;
  color: string;
  limitCents: Cents;
  /** 1–31; em mês mais curto cai no último dia. */
  closingDay: number;
  /** 1–31; em mês mais curto cai no último dia. */
  dueDay: number;
  /** Conta sugerida para pagar a fatura. */
  paymentAccountId: Id | null;
  archivedAt: Timestamp | null;
};

export const invoiceStatuses = ['open', 'closed', 'paid', 'partial'] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type Invoice = Entity & {
  cardId: Id;
  /** Mês do vencimento. */
  referenceMonth: YearMonth;
  closingDate: ISODate;
  dueDate: ISODate;
  status: InvoiceStatus;
};

// ─── Categorias ──────────────────────────────────────────────────────────────

export const categoryKinds = ['expense', 'income'] as const;
export type CategoryKind = (typeof categoryKinds)[number];

export type Category = Entity & {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  parentId: Id | null;
};

// ─── Lançamentos ─────────────────────────────────────────────────────────────

export const transactionKinds = [
  'income',
  'expense',
  'transfer',
  'card_purchase',
  'invoice_payment',
  'adjustment',
] as const;
export type TransactionKind = (typeof transactionKinds)[number];

/** Tipos cujo sentido não é implícito e exigem `direction`. */
export const directionalKinds = [
  'transfer',
  'adjustment',
] as const satisfies readonly TransactionKind[];

/**
 * Sentido do valor, já que `amountCents` é sempre positivo.
 * - `transfer`: `out` na perna de origem, `in` na de destino.
 * - `adjustment` em conta: `in` aumenta o saldo, `out` diminui.
 * - `adjustment` em cartão (estorno): `in` é crédito na fatura, `out` é débito.
 * Nos demais tipos é `null` (o sentido vem do `kind`).
 */
export type TransactionDirection = 'in' | 'out';

export const transactionStatuses = ['posted', 'scheduled', 'pending'] as const;
/** Efetivada, futura ou aguardando confirmação (a partir da Fase 2). */
export type TransactionStatus = (typeof transactionStatuses)[number];

export const transactionSources = ['manual', 'notification', 'receipt', 'open_finance'] as const;
export type TransactionSource = (typeof transactionSources)[number];

export type Transaction = Entity & {
  kind: TransactionKind;
  /** Sempre positivo; o sentido vem de `kind` e `direction`. */
  amountCents: Cents;
  direction: TransactionDirection | null;
  date: ISODate;
  description: string;
  categoryId: Id | null;
  accountId: Id | null;
  cardId: Id | null;
  invoiceId: Id | null;
  /** A outra perna de uma transferência. */
  transferPeerId: Id | null;
  installmentGroupId: Id | null;
  /** Estorno (`adjustment` `in` no cartão): a compra estornada. */
  refundOfId: Id | null;
  /** 1 a `installmentTotal`. */
  installmentNumber: number | null;
  installmentTotal: number | null;
  status: TransactionStatus;
  source: TransactionSource;
  notes: string | null;
};

// ─── Entradas dos serviços (Fase 1) ──────────────────────────────────────────

export type NewTransaction = {
  kind: Extract<TransactionKind, 'income' | 'expense'>;
  amountCents: Cents;
  date: ISODate;
  description: string;
  categoryId: Id | null;
  accountId: Id;
  status?: Extract<TransactionStatus, 'posted' | 'scheduled'>;
  notes?: string | null;
  /** Padrão `manual`; `notification` quando vem de uma captura confirmada (Fase 2). */
  source?: TransactionSource;
};

export type NewCardPurchase = {
  cardId: Id;
  /** Valor total; dividido em parcelas com o resto na primeira. */
  amountCents: Cents;
  installments: number;
  date: ISODate;
  description: string;
  categoryId: Id | null;
  notes?: string | null;
  /** Padrão `manual`; `notification` quando vem de uma captura confirmada (Fase 2). */
  source?: TransactionSource;
};

export type NewTransfer = {
  fromAccountId: Id;
  toAccountId: Id;
  amountCents: Cents;
  date: ISODate;
  description?: string;
};

export type TxFilters = {
  search?: string;
  kinds?: TransactionKind[];
  categoryIds?: Id[];
  accountIds?: Id[];
  cardIds?: Id[];
  statuses?: TransactionStatus[];
};

export type DayGroup = {
  date: ISODate;
  transactions: Transaction[];
  /** Receitas − despesas do dia (transferências não entram). */
  netCents: Cents;
};

// ─── Capturas (Fase 2) ───────────────────────────────────────────────────────

/**
 * Tipo de lançamento que uma notificação sugere. `card_refund` (Fase 3, trilha C): estorno
 * no cartão; ao confirmar vira `adjustment` ligado à compra (`refundCardPurchase`).
 */
export const captureKinds = ['expense', 'income', 'card_purchase', 'card_refund'] as const;
export type CaptureKind = (typeof captureKinds)[number];

/** Por onde a captura chegou: notificação do banco (Fase 2) ou comprovante compartilhado (Fase 3, trilha E). */
export const captureChannels = ['notification', 'receipt'] as const;
export type CaptureChannel = (typeof captureChannels)[number];

/** Pendente na caixa, confirmada (virou lançamento) ou descartada. */
export const captureStatuses = ['pending', 'confirmed', 'discarded'] as const;
export type CaptureStatus = (typeof captureStatuses)[number];

/** O que um parser (trilha C) extrai do texto de uma notificação. */
export type ParsedNotification = {
  amountCents: Cents;
  kind: CaptureKind;
  /** Estabelecimento ou pessoa, como veio no texto (vira a descrição sugerida). */
  merchant: string | null;
  /** Data da transação; se o texto não traz, a data local em que o banco notificou. */
  date: ISODate;
  /** Últimos 4 dígitos do cartão, quando o texto traz. */
  cardLastDigits: string | null;
  /** 0 a 1: quão certo o parser está de valor e tipo. */
  confidence: number;
  /** Compra parcelada ("em 3x"): número de parcelas; `null` ou 1 = à vista (Fase 3, trilha C). */
  installments?: number | null;
};

/**
 * Sugestão extraída de uma notificação. Nada vira lançamento sem o usuário confirmar.
 * Notificação que nenhum parser reconheceu fica com `parser: null` e os campos da
 * interpretação vazios ("não interpretada"); nunca é descartada sozinha.
 */
export type Capture = Entity & {
  /** `RawNotification.id` do módulo nativo; cada notificação gera no máximo uma captura. */
  rawId: string;
  packageName: string;
  title: string | null;
  text: string | null;
  /** Quando o banco notificou. */
  postedAt: Timestamp;
  /** Parser que reconheceu o texto (ex.: `nubank`, `generic`); `null` = não interpretada. */
  parser: string | null;
  amountCents: Cents | null;
  kind: CaptureKind | null;
  merchant: string | null;
  date: ISODate | null;
  cardLastDigits: string | null;
  /** Origem sugerida: uma conta ou um cartão (pelas regras aprendidas), nunca os dois. */
  suggestedAccountId: Id | null;
  suggestedCardId: Id | null;
  /** 0 a 1; 0 quando não interpretada. */
  confidence: number;
  status: CaptureStatus;
  /** Lançamento criado ao confirmar (o primeiro, se parcelado) ou o já existente vinculado. */
  transactionId: Id | null;
  // ── Fase 3 ──
  channel: CaptureChannel;
  /** Categoria sugerida pelas regras de estabelecimento (trilha B). */
  suggestedCategoryId: Id | null;
  /** Parcelas detectadas no texto; `null` = à vista (trilha C). */
  installments: number | null;
  /**
   * Lançamento já existente que parece ser o mesmo (trilha A): sugerir "vincular". Em
   * `card_refund`, a compra que o estorno devolve (trilha C).
   */
  matchTransactionId: Id | null;
  /** 0 a 1; 0 sem candidato. */
  matchScore: number;
  /** Mesma transação já capturada por outra fonte (ex.: push + SMS): fica descartada. */
  duplicateOfId: Id | null;
  /** O usuário mudou algo da sugestão ao confirmar (mede a precisão por fonte). */
  editedOnConfirm: boolean;
  /** Entrou sozinho pelo nível automático (trilha D), com selo e "Desfazer". */
  autoConfirmed: boolean;
};

/**
 * Regra aprendida por estabelecimento (Fase 3, trilha B): "iFood" → categoria e origem.
 * `merchantKey` é o nome normalizado (sem acentos, minúsculo, sem sufixos como "LTDA").
 */
export type MerchantRule = Entity & {
  merchantKey: string;
  categoryId: Id | null;
  accountId: Id | null;
  cardId: Id | null;
  /** Quantas confirmações ensinaram esta regra. */
  hits: number;
};

/** Configuração por fonte (app do banco ou comprovantes): nível automático (trilha D). */
export type CaptureSource = Entity & {
  packageName: string;
  autoConfirm: boolean;
};

/**
 * Regra aprendida ao confirmar: notificações deste app (e deste final de cartão, se houver)
 * vão para esta conta ou cartão.
 */
export type CaptureOriginRule = Entity & {
  packageName: string;
  /** `null` vale para qualquer notificação do app. */
  cardLastDigits: string | null;
  accountId: Id | null;
  cardId: Id | null;
};
