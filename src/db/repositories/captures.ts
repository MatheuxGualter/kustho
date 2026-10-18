import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Capture, CaptureOriginRule, CaptureStatus } from '@/domain/types';
import { nowTimestamp } from '@/lib/id';

import type { AppDatabase } from '../database';
import { captureOriginRules, captures } from '../schema';
import { type EntityKeys, newEntity } from './common';

export type CaptureFields = Omit<Capture, EntityKeys>;
export type OriginRuleFields = Omit<CaptureOriginRule, EntityKeys>;

/** Grava a captura; devolve `false` se a notificação (`rawId`) já tinha captura. */
export async function insertCapture(db: AppDatabase, fields: CaptureFields): Promise<boolean> {
  const inserted = await db
    .insert(captures)
    .values({ ...newEntity(), ...fields })
    .onConflictDoNothing({ target: captures.rawId })
    .returning({ id: captures.id });
  return inserted.length > 0;
}

export async function listByStatus(db: AppDatabase, status: CaptureStatus): Promise<Capture[]> {
  return db
    .select()
    .from(captures)
    .where(and(isNull(captures.deletedAt), eq(captures.status, status)))
    .orderBy(desc(captures.postedAt), desc(captures.createdAt));
}

export async function countByStatus(db: AppDatabase, status: CaptureStatus): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(captures)
    .where(and(isNull(captures.deletedAt), eq(captures.status, status)));
  return row?.count ?? 0;
}

export async function getCapture(db: AppDatabase, id: string): Promise<Capture | undefined> {
  const [row] = await db
    .select()
    .from(captures)
    .where(and(eq(captures.id, id), isNull(captures.deletedAt)));
  return row;
}

export async function updateCapture(
  db: AppDatabase,
  id: string,
  patch: Partial<Pick<Capture, 'status' | 'transactionId'>>,
): Promise<void> {
  await db
    .update(captures)
    .set({ ...patch, updatedAt: nowTimestamp() })
    .where(eq(captures.id, id));
}

export async function listOriginRules(db: AppDatabase): Promise<CaptureOriginRule[]> {
  return db.select().from(captureOriginRules).where(isNull(captureOriginRules.deletedAt));
}

/** Uma regra por app + final de cartão: a confirmação mais recente vence. */
export async function upsertOriginRule(db: AppDatabase, rule: OriginRuleFields): Promise<void> {
  const [existing] = await db
    .select({ id: captureOriginRules.id })
    .from(captureOriginRules)
    .where(
      and(
        isNull(captureOriginRules.deletedAt),
        eq(captureOriginRules.packageName, rule.packageName),
        rule.cardLastDigits === null
          ? isNull(captureOriginRules.cardLastDigits)
          : eq(captureOriginRules.cardLastDigits, rule.cardLastDigits),
      ),
    );
  if (existing) {
    await db
      .update(captureOriginRules)
      .set({ accountId: rule.accountId, cardId: rule.cardId, updatedAt: nowTimestamp() })
      .where(eq(captureOriginRules.id, existing.id));
  } else {
    await db.insert(captureOriginRules).values({ ...newEntity(), ...rule });
  }
}
