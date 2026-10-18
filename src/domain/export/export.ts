/**
 * Exportação dos dados (trilha D): CSV dos lançamentos para planilhas e JSON completo para
 * backup. Funções puras.
 */
import type { Account, Category, CreditCard, Invoice, Transaction } from '@/domain/types';
import { formatDateBR } from '@/lib/dates';

export type ExportData = {
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  invoices?: Invoice[];
  transactions: Transaction[];
};

export const CSV_HEADER = [
  'data',
  'descricao',
  'tipo',
  'valor',
  'categoria',
  'conta',
  'cartao',
  'parcela',
  'situacao',
  'observacoes',
] as const;

/** Valor com vírgula decimal e sinal (saídas negativas), como planilhas em pt-BR esperam. */
function csvAmount(tx: Transaction): string {
  const outflow =
    tx.kind === 'expense' ||
    tx.kind === 'card_purchase' ||
    tx.kind === 'invoice_payment' ||
    ((tx.kind === 'transfer' || tx.kind === 'adjustment') && tx.direction === 'out');
  const abs = (tx.amountCents / 100).toFixed(2).replace('.', ',');
  return outflow ? `-${abs}` : abs;
}

/** Aspas quando o campo tem separador, aspas ou quebra de linha (RFC 4180, com `;`). */
function csvField(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV com `;` (padrão do Excel em pt-BR) e BOM, para acentos abrirem certo. */
export function toCsv(data: ExportData): string {
  const name = (list: { id: string; name: string }[], id: string | null) =>
    (id && list.find((x) => x.id === id)?.name) || '';
  const lines = data.transactions.map((tx) =>
    [
      formatDateBR(tx.date),
      tx.description,
      tx.kind,
      csvAmount(tx),
      name(data.categories, tx.categoryId),
      name(data.accounts, tx.accountId),
      name(data.cards, tx.cardId),
      tx.installmentNumber ? `${tx.installmentNumber}/${tx.installmentTotal}` : '',
      tx.status,
      tx.notes ?? '',
    ]
      .map(csvField)
      .join(';'),
  );
  return `﻿${[CSV_HEADER.join(';'), ...lines].join('\r\n')}\r\n`;
}

/** Backup completo em JSON (valores em centavos, como no banco). */
export function toJson(data: ExportData, exportedAt: string): string {
  return JSON.stringify({ app: 'kustho', version: 1, exportedAt, ...data }, null, 2);
}
