import { cycleForPurchase } from '@/domain/invoices/cycle';
import type { Transaction } from '@/domain/types';
import { addMonths, compareDates, monthOf } from '@/lib/dates';
import { sumCents } from '@/lib/money';

import { listAccounts } from '../repositories/accounts';
import { listTransactionsBetween } from '../repositories/transactions';
import { buildDefaultCategories } from '../seed';
import { buildDevSeed, clearDevData, runDevSeed } from '../devSeed';
import { categories } from '../schema';
import { createTestDb } from '../test/testDb';

const today = '2026-10-17';
let n = 0;
const makeId = () => `id-${n++}`;
const defaults = buildDefaultCategories('2026-10-01T00:00:00.000Z', makeId);
const seed = buildDevSeed({ today, categories: defaults, makeId, now: '2026-10-17T00:00:00.000Z' });
const byId = new Map(seed.transactions.map((t) => [t.id, t]));

describe('buildDevSeed', () => {
  it('tem 3 contas, 2 cartões e lançamentos nos últimos 3 meses', () => {
    expect(seed.accounts).toHaveLength(3);
    expect(seed.creditCards).toHaveLength(2);
    const months = new Set(
      seed.transactions.filter((t) => t.kind !== 'card_purchase').map((t) => monthOf(t.date)),
    );
    expect(months).toEqual(new Set(['2026-08', '2026-09', '2026-10', '2026-11']));
  });

  it('é determinístico', () => {
    let m = 0;
    const again = buildDevSeed({
      today,
      categories: defaults,
      makeId: () => `x-${m++}`,
      now: '2026-10-17T00:00:00.000Z',
    });
    const strip = (t: Transaction) => [t.kind, t.date, t.amountCents, t.description];
    expect(again.transactions.map(strip)).toEqual(seed.transactions.map(strip));
  });

  it('só o que não é do cartão e está no futuro fica como previsto', () => {
    for (const t of seed.transactions) {
      if (t.kind === 'card_purchase') continue;
      expect(t.status).toBe(compareDates(t.date, today) <= 0 ? 'posted' : 'scheduled');
    }
    expect(seed.transactions.filter((t) => t.status === 'scheduled')).toHaveLength(1);
  });

  it('cada compra à vista está na fatura certa', () => {
    for (const t of seed.transactions.filter(
      (t) => t.kind === 'card_purchase' && !t.installmentGroupId,
    )) {
      const card = seed.creditCards.find((c) => c.id === t.cardId)!;
      const invoice = seed.invoices.find((i) => i.id === t.invoiceId)!;
      expect(invoice.cardId).toBe(card.id);
      expect(invoice.referenceMonth).toBe(cycleForPurchase(card, t.date).referenceMonth);
    }
  });

  it('parcelas somam o total e caem em faturas consecutivas', () => {
    const groups = Map.groupBy(
      seed.transactions.filter((t) => t.installmentGroupId),
      (t) => t.installmentGroupId,
    );
    const totals = [...groups.values()].map((g) => sumCents(g.map((t) => t.amountCents)));
    expect(totals.sort()).toEqual([120000, 459000]);
    for (const group of groups.values()) {
      const months = group.map(
        (t) => seed.invoices.find((i) => i.id === t.invoiceId)!.referenceMonth,
      );
      months.forEach((m, i) => i > 0 && expect(m).toBe(addMonths(months[i - 1], 1)));
      expect(group.map((t) => t.installmentNumber)).toEqual(group.map((_, i) => i + 1));
    }
  });

  it('transferências têm duas pernas ligadas', () => {
    const transfers = seed.transactions.filter((t) => t.kind === 'transfer');
    expect(transfers.length).toBeGreaterThan(0);
    for (const t of transfers) {
      const peer = byId.get(t.transferPeerId!)!;
      expect(peer.transferPeerId).toBe(t.id);
      expect(peer.amountCents).toBe(t.amountCents);
      expect(new Set([t.direction, peer.direction])).toEqual(new Set(['in', 'out']));
    }
  });

  it('faturas vencidas estão pagas (uma em parte), com o pagamento debitando a conta', () => {
    const due = seed.invoices.filter((i) => compareDates(i.dueDate, today) <= 0);
    expect(due.length).toBeGreaterThan(0);
    expect(due.filter((i) => i.status === 'partial')).toHaveLength(1);
    for (const invoice of due) {
      const payments = seed.transactions.filter(
        (t) => t.kind === 'invoice_payment' && t.invoiceId === invoice.id,
      );
      expect(payments).toHaveLength(1);
      expect(payments[0].accountId).not.toBeNull();
    }
    expect(seed.invoices.some((i) => i.status === 'closed' || i.status === 'open')).toBe(true);
  });

  it('cobre todos os tipos de lançamento', () => {
    expect(new Set(seed.transactions.map((t) => t.kind))).toEqual(
      new Set(['income', 'expense', 'transfer', 'card_purchase', 'invoice_payment', 'adjustment']),
    );
  });
});

describe('runDevSeed', () => {
  it('grava tudo respeitando as restrições do banco e substitui os dados anteriores', async () => {
    const { db } = createTestDb();
    await db.insert(categories).values(buildDefaultCategories());
    const first = await runDevSeed(db, today);
    await runDevSeed(db, today);
    expect(await listAccounts(db)).toHaveLength(3);
    const stored = await listTransactionsBetween(db, '2000-01-01', '2100-12-31');
    expect(stored).toHaveLength(first.transactions.length);
    await clearDevData(db);
    expect(await listAccounts(db)).toHaveLength(0);
  });
});
