import type { Transaction } from '@/domain/types';

import { type ExportData, toCsv, toJson } from '../export';

const base: Transaction = {
  id: 't1',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  kind: 'expense',
  amountCents: 4590,
  direction: null,
  date: '2026-10-17',
  description: 'Almoço',
  categoryId: 'c1',
  accountId: 'a1',
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
};

const data = {
  accounts: [{ id: 'a1', name: 'Nubank' }],
  cards: [{ id: 'k1', name: 'Roxinho' }],
  categories: [{ id: 'c1', name: 'Alimentação' }],
} as unknown as Omit<ExportData, 'transactions'>;

const lines = (csv: string) => csv.replace('﻿', '').trim().split('\r\n');

describe('toCsv', () => {
  it('cabeçalho, data BR, valor com vírgula e sinal de saída, nomes', () => {
    const [header, row] = lines(toCsv({ ...data, transactions: [base] }));
    expect(header).toBe(
      'data;descricao;tipo;valor;categoria;conta;cartao;parcela;situacao;observacoes',
    );
    expect(row).toBe('17/10/2026;Almoço;expense;-45,90;Alimentação;Nubank;;;posted;');
  });

  it('receita positiva, parcela e cartão', () => {
    const income = { ...base, kind: 'income' as const, amountCents: 650000 };
    const purchase = {
      ...base,
      kind: 'card_purchase' as const,
      accountId: null,
      cardId: 'k1',
      installmentNumber: 2,
      installmentTotal: 10,
    };
    const [, a, b] = lines(toCsv({ ...data, transactions: [income, purchase] }));
    expect(a.split(';')[3]).toBe('6500,00');
    expect(b.split(';').slice(3, 8)).toEqual(['-45,90', 'Alimentação', '', 'Roxinho', '2/10']);
  });

  it('escapa ponto e vírgula, aspas e quebras de linha', () => {
    const tricky = { ...base, description: 'Pão; "francês"', notes: 'linha 1\nlinha 2' };
    const [, row] = lines(toCsv({ ...data, transactions: [tricky] }));
    expect(row).toContain('"Pão; ""francês"""');
    expect(row).toContain('"linha 1\nlinha 2"');
  });

  it('começa com BOM para o Excel abrir os acentos', () => {
    expect(toCsv({ ...data, transactions: [] }).startsWith('﻿')).toBe(true);
  });
});

it('toJson inclui metadados e os dados em centavos', () => {
  const parsed = JSON.parse(toJson({ ...data, transactions: [base] }, '2026-10-18T00:00:00.000Z'));
  expect(parsed).toMatchObject({
    app: 'kustho',
    version: 1,
    exportedAt: '2026-10-18T00:00:00.000Z',
  });
  expect(parsed.transactions[0].amountCents).toBe(4590);
});
