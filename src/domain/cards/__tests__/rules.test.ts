import type { Invoice, Transaction } from '@/domain/types';

import {
  availableLimit,
  buildCardPurchase,
  invoiceStatus,
  invoiceTotals,
  refundReferenceMonth,
} from '../rules';

type InvoiceTx = Pick<
  Transaction,
  'kind' | 'amountCents' | 'direction' | 'deletedAt' | 'invoiceId'
>;
const t = (fields: Partial<InvoiceTx>): InvoiceTx => ({
  kind: 'card_purchase',
  amountCents: 1000,
  direction: null,
  deletedAt: null,
  invoiceId: 'inv',
  ...fields,
});

const card = { closingDay: 3, dueDay: 10, limitCents: 500000 };

describe('invoiceTotals', () => {
  it('compras − estornos; pagamentos à parte', () => {
    const totals = invoiceTotals('inv', [
      t({ amountCents: 10000 }),
      t({ amountCents: 5000 }),
      t({ kind: 'adjustment', direction: 'in', amountCents: 2000 }),
      t({ kind: 'invoice_payment', amountCents: 4000 }),
      t({ amountCents: 999, deletedAt: '2026-10-01T00:00:00.000Z' }),
      t({ amountCents: 777, invoiceId: 'outra' }),
    ]);
    expect(totals).toEqual({ totalCents: 13000, paidCents: 4000, remainingCents: 9000 });
  });

  it('pago a mais não deixa restante negativo', () => {
    expect(
      invoiceTotals('inv', [t({}), t({ kind: 'invoice_payment', amountCents: 5000 })])
        .remainingCents,
    ).toBe(0);
  });
});

describe('invoiceStatus (regra 6)', () => {
  const inv = { closingDate: '2026-11-03', dueDate: '2026-11-10' };
  const totals = (total: number, paid: number) => ({
    totalCents: total,
    paidCents: paid,
    remainingCents: Math.max(0, total - paid),
  });

  it('aberta até o fechamento, fechada depois', () => {
    expect(invoiceStatus(inv, totals(1000, 0), '2026-11-02')).toBe('open');
    expect(invoiceStatus(inv, totals(1000, 0), '2026-11-03')).toBe('closed');
  });

  it('pagamento parcial e total', () => {
    expect(invoiceStatus(inv, totals(1000, 400), '2026-11-05')).toBe('partial');
    expect(invoiceStatus(inv, totals(1000, 1000), '2026-11-05')).toBe('paid');
  });

  it('fatura zerada continua aberta ou fechada pela data', () => {
    expect(invoiceStatus(inv, totals(0, 0), '2026-11-20')).toBe('closed');
  });
});

describe('availableLimit (regra 5)', () => {
  it('limite − restante de todas as faturas, incluindo parcelas futuras', () => {
    expect(
      availableLimit(500000, [
        { totalCents: 100000, paidCents: 100000, remainingCents: 0 },
        { totalCents: 80000, paidCents: 30000, remainingCents: 50000 },
        { totalCents: 45900, paidCents: 0, remainingCents: 45900 },
      ]),
    ).toBe(500000 - 50000 - 45900);
  });
});

describe('buildCardPurchase (regra 4)', () => {
  it('R$ 100,00 em 3x: resto na 1ª, uma parcela por fatura, datas mês a mês', () => {
    const rows = buildCardPurchase(card, {
      amountCents: 10000,
      installments: 3,
      date: '2026-10-20',
    });
    expect(rows.map((r) => r.amountCents)).toEqual([3334, 3333, 3333]);
    expect(rows.map((r) => r.cycle.referenceMonth)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(rows.map((r) => r.date)).toEqual(['2026-10-20', '2026-11-20', '2026-12-20']);
    expect(rows.map((r) => r.installmentNumber)).toEqual([1, 2, 3]);
  });

  it('à vista: uma linha sem numeração de parcela', () => {
    const [row] = buildCardPurchase(card, {
      amountCents: 4590,
      installments: 1,
      date: '2026-10-02',
    });
    expect(row).toMatchObject({ amountCents: 4590, installmentNumber: null, date: '2026-10-02' });
    expect(row.cycle.referenceMonth).toBe('2026-10');
  });

  it('compra no dia 31: parcela de fevereiro cai no último dia', () => {
    const rows = buildCardPurchase(card, { amountCents: 300, installments: 2, date: '2027-01-31' });
    expect(rows[1].date).toBe('2027-02-28');
  });

  it('rejeita parcelas ou valor inválidos', () => {
    expect(() =>
      buildCardPurchase(card, { amountCents: 0, installments: 1, date: '2026-10-01' }),
    ).toThrow('invalid_amount');
    expect(() =>
      buildCardPurchase(card, { amountCents: 100, installments: 0, date: '2026-10-01' }),
    ).toThrow();
  });
});

describe('refundReferenceMonth (estorno)', () => {
  const purchaseInvoice: Pick<Invoice, 'referenceMonth' | 'closingDate'> = {
    referenceMonth: '2026-11',
    closingDate: '2026-11-03',
  };

  it('fatura da compra ainda aberta: estorno entra nela', () => {
    expect(refundReferenceMonth(card, purchaseInvoice, '2026-10-25')).toBe('2026-11');
  });

  it('fatura da compra já fechou: estorno vai para a fatura aberta', () => {
    expect(refundReferenceMonth(card, purchaseInvoice, '2026-11-15')).toBe('2026-12');
  });
});
