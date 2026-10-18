/**
 * Serviço real da trilha D (Fase 2): capturas no SQLite do app. Os lançamentos são criados
 * pelos serviços de lançamentos e cartões, com `source: 'notification'`.
 */
import type { NotificationCaptureApi } from '../../../modules/notification-capture/src/NotificationCapture.types';
import type { AppDatabase } from '@/db/database';
import * as repo from '@/db/repositories/captures';
import type {
  CapturesService,
  CardsService,
  NotificationParser,
  TransactionsService,
} from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import type { Transaction } from '@/domain/types';

import { buildCapture, learnedRule, parseNotification, resolveConfirmation } from './rules';

/** Quantas notificações cruas o `ingest` lê por vez. */
const INGEST_BATCH = 100;

export function createCapturesService(
  db: AppDatabase,
  deps: {
    transactions: TransactionsService;
    cards: CardsService;
    /** Módulo nativo (ou o fake dele). */
    notifications: NotificationCaptureApi;
    parsers: readonly NotificationParser[];
  },
): CapturesService {
  const requirePending = async (id: string) => {
    const capture = await repo.getCapture(db, id);
    if (!capture || capture.status !== 'pending') {
      throw new DomainError('not_found', `Captura pendente não encontrada: ${id}`);
    }
    return capture;
  };

  // Duas chamadas ao mesmo tempo (abrir o app + evento do módulo) leriam o mesmo lote.
  let running: Promise<number> | null = null;
  const ingestOnce = async () => {
    const rules = await repo.listOriginRules(db);
    let created = 0;
    for (;;) {
      const batch = await deps.notifications.getPending(INGEST_BATCH);
      if (batch.length === 0) break;
      for (const raw of batch) {
        const fields = buildCapture(raw, parseNotification(deps.parsers, raw), rules);
        if (await repo.insertCapture(db, fields)) created++;
      }
      // Só depois de gravar: se o app cair no meio, o lote é lido de novo (o rawId evita duplicar).
      await deps.notifications.markProcessed(batch.map((raw) => raw.id));
      if (batch.length < INGEST_BATCH) break;
    }
    return created;
  };

  const service: CapturesService = {
    ingest() {
      running ??= ingestOnce().finally(() => {
        running = null;
      });
      return running;
    },

    listPending: () => repo.listByStatus(db, 'pending'),
    countPending: () => repo.countByStatus(db, 'pending'),
    getCapture: (id) => repo.getCapture(db, id),

    async confirmCapture(id, input = {}) {
      const capture = await requirePending(id);
      const confirmation = resolveConfirmation(capture, input);
      if (!confirmation) throw new DomainError('capture_incomplete');

      const { kind, amountCents, date, description, categoryId } = confirmation;
      let created: Transaction[];
      if (kind === 'card_purchase') {
        created = await deps.cards.createCardPurchase({
          cardId: confirmation.cardId!,
          amountCents,
          installments: confirmation.installments ?? 1,
          date,
          description,
          categoryId,
          source: 'notification',
        });
      } else {
        created = [
          await deps.transactions.createTransaction({
            kind,
            amountCents,
            date,
            description,
            categoryId,
            accountId: confirmation.accountId!,
            source: 'notification',
          }),
        ];
      }

      await repo.updateCapture(db, id, { status: 'confirmed', transactionId: created[0].id });
      await repo.upsertOriginRule(db, learnedRule(capture, confirmation));
      return created;
    },

    async confirmMany(ids) {
      const confirmed: string[] = [];
      const skipped: string[] = [];
      for (const id of ids) {
        try {
          await service.confirmCapture(id);
          confirmed.push(id);
        } catch (e) {
          if (e instanceof DomainError && e.code === 'capture_incomplete') skipped.push(id);
          else throw e;
        }
      }
      return { confirmed, skipped };
    },

    async discardCapture(id) {
      await requirePending(id);
      await repo.updateCapture(db, id, { status: 'discarded' });
    },

    async restoreCapture(id) {
      const capture = await repo.getCapture(db, id);
      if (capture?.status === 'discarded') {
        await repo.updateCapture(db, id, { status: 'pending' });
      }
    },
  };
  return service;
}
