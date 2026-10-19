/**
 * Aplica as migrações num SQLite real (node:sqlite) e confere as restrições do schema.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createMigratedSqlite as migratedDb } from '../test/testDb';

const now = '2026-10-17T12:00:00.000Z';

function insertAccount(db: DatabaseSync, id = 'acc-1') {
  db.prepare(
    `INSERT INTO accounts (id, created_at, updated_at, name, type, institution, color, icon)
     VALUES (?, ?, ?, 'Conta', 'checking', 'Banco', '#0F766E', 'wallet')`,
  ).run(id, now, now);
}

function insertTx(db: DatabaseSync, fields: Record<string, string | number | null>) {
  const row = {
    id: 'tx-1',
    created_at: now,
    updated_at: now,
    kind: 'expense',
    amount_cents: 4590,
    date: '2026-10-17',
    description: 'Almoço',
    account_id: 'acc-1',
    ...fields,
  };
  const cols = Object.keys(row);
  db.prepare(
    `INSERT INTO transactions (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
  ).run(...Object.values(row));
}

describe('migrações', () => {
  it('criam as tabelas da Fase 1', () => {
    const db = migratedDb();
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .all()
      .map((r) => (r as { name: string }).name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'accounts',
        'categories',
        'credit_cards',
        'invoices',
        'transactions',
      ]),
    );
  });

  it('aceitam uma despesa válida com os padrões posted/manual', () => {
    const db = migratedDb();
    insertAccount(db);
    insertTx(db, {});
    expect(db.prepare('SELECT status, source FROM transactions').get()).toEqual({
      status: 'posted',
      source: 'manual',
    });
  });

  it('rejeitam valor zero ou negativo', () => {
    const db = migratedDb();
    insertAccount(db);
    expect(() => insertTx(db, { amount_cents: 0 })).toThrow(/CHECK/);
    expect(() => insertTx(db, { amount_cents: -10 })).toThrow(/CHECK/);
  });

  it('exigem direction em transferência e ajuste, e proíbem nos demais', () => {
    const db = migratedDb();
    insertAccount(db);
    expect(() => insertTx(db, { kind: 'transfer' })).toThrow(/CHECK/);
    expect(() => insertTx(db, { kind: 'adjustment' })).toThrow(/CHECK/);
    expect(() => insertTx(db, { kind: 'expense', direction: 'out' })).toThrow(/CHECK/);
    insertTx(db, { id: 'tx-2', kind: 'adjustment', direction: 'in' });
  });

  it('exigem conta ou cartão', () => {
    const db = migratedDb();
    expect(() => insertTx(db, { account_id: null })).toThrow(/CHECK/);
  });

  it('impedem duas faturas do mesmo cartão no mesmo mês', () => {
    const db = migratedDb();
    db.prepare(
      `INSERT INTO credit_cards (id, created_at, updated_at, name, institution, color, limit_cents, closing_day, due_day)
       VALUES ('card-1', ?, ?, 'Cartão', 'Banco', '#7C3AED', 500000, 3, 10)`,
    ).run(now, now);
    const insertInvoice = (id: string) =>
      db
        .prepare(
          `INSERT INTO invoices (id, created_at, updated_at, card_id, reference_month, closing_date, due_date)
           VALUES (?, ?, ?, 'card-1', '2026-11', '2026-11-03', '2026-11-10')`,
        )
        .run(id, now, now);
    insertInvoice('inv-1');
    expect(() => insertInvoice('inv-2')).toThrow(/UNIQUE/);
  });

  it('rejeitam dia de fechamento fora de 1–31', () => {
    const db = migratedDb();
    expect(() =>
      db
        .prepare(
          `INSERT INTO credit_cards (id, created_at, updated_at, name, institution, color, limit_cents, closing_day, due_day)
           VALUES ('card-1', ?, ?, 'Cartão', 'Banco', '#7C3AED', 500000, 32, 10)`,
        )
        .run(now, now),
    ).toThrow(/CHECK/);
  });
});

describe('0002_refund_of', () => {
  /** Banco só com as migrações anteriores, para simular dados antigos. */
  function upTo0001(): DatabaseSync {
    const dir = join(__dirname, '..', 'migrations');
    const db = new DatabaseSync(':memory:');
    const run = (file: string) => {
      for (const s of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
        db.exec(s);
      }
    };
    for (const f of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      if (f < '0002') run(f);
    }
    return Object.assign(db, { run0002: () => run('0002_refund_of.sql') });
  }

  it('liga estornos antigos à compra pela descrição e pelo cartão', () => {
    const db = upTo0001() as DatabaseSync & { run0002: () => void };
    db.exec(`INSERT INTO credit_cards (id, created_at, updated_at, name, institution, color, limit_cents, closing_day, due_day)
             VALUES ('card', '${now}', '${now}', 'Nu', 'Nubank', '#820AD1', 100000, 7, 14)`);
    const card = { account_id: null, card_id: 'card' };
    insertTx(db, {
      ...card,
      id: 'p1',
      kind: 'card_purchase',
      amount_cents: 8069,
      description: 'Ifood',
      date: '2026-10-18',
    });
    insertTx(db, {
      ...card,
      id: 'p2',
      kind: 'card_purchase',
      amount_cents: 5000,
      description: 'Uber',
      date: '2026-10-18',
    });
    insertTx(db, {
      ...card,
      id: 'r1',
      kind: 'adjustment',
      direction: 'in',
      amount_cents: 100,
      description: 'Estorno Ifood',
      date: '2026-10-18',
    });
    insertTx(db, {
      ...card,
      id: 'r2',
      kind: 'adjustment',
      direction: 'in',
      amount_cents: 300,
      description: 'Ajuste manual',
      date: '2026-10-18',
    });

    db.run0002();
    const link = (id: string) =>
      (
        db.prepare('SELECT refund_of_id AS r FROM transactions WHERE id = ?').get(id) as {
          r: string | null;
        }
      ).r;
    expect(link('r1')).toBe('p1');
    expect(link('r2')).toBeNull();
    expect(link('p1')).toBeNull();
  });
});

describe('0003_fase3_conciliacao', () => {
  it('mantém as capturas antigas com os padrões da Fase 3', () => {
    const dir = join(__dirname, '..', 'migrations');
    const db = new DatabaseSync(':memory:');
    const run = (file: string) => {
      for (const sql of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
        db.exec(sql);
      }
    };
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const f of files.filter((f) => f < '0003')) run(f);
    db.exec(`INSERT INTO captures (id, created_at, updated_at, raw_id, package_name, posted_at)
             VALUES ('c1', '${now}', '${now}', 'raw-1', 'com.nu.production', '${now}')`);
    for (const f of files.filter((f) => f.startsWith('0003'))) run(f);

    const row = db.prepare('SELECT * FROM captures WHERE id = ?').get('c1') as Record<
      string,
      unknown
    >;
    expect(row).toMatchObject({
      channel: 'notification',
      match_score: 0,
      edited_on_confirm: 0,
      auto_confirmed: 0,
      installments: null,
      suggested_category_id: null,
    });
  });
});
