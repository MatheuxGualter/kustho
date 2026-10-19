/**
 * Serviço real da trilha D (Fase 2): capturas no SQLite do app. Os lançamentos são criados
 * pelos serviços de lançamentos e cartões, com `source: 'notification'`.
 */
import type { NotificationCaptureApi } from '../../../modules/notification-capture/src/NotificationCapture.types';
import type { AppDatabase } from '@/db/database';
import { listAccounts } from '@/db/repositories/accounts';
import * as repo from '@/db/repositories/captures';
import * as txRepo from '@/db/repositories/transactions';
import type {
  CapturesService,
  CardsService,
  NotificationParser,
  TransactionsService,
} from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import { buildReceiptCapture } from '@/domain/receipts/capture';
import type { Transaction } from '@/domain/types';

import { applyMerchantRule, confirmationEdited, learnedMerchantRule } from './merchantRules';
import { candidateWindow, decideMatch, type MatchableCapture, matchFields } from './matcher';
import {
  buildCapture,
  learnedRule,
  linkedRule,
  parseNotification,
  resolveConfirmation,
} from './rules';

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
  /** Sugestão de vínculo (trilha A) para uma captura ainda não gravada. */
  const suggestLink = async (fields: MatchableCapture, linked: ReadonlySet<string>) => {
    if (!fields.date || !fields.amountCents) return matchFields({ action: 'create', score: 0 });
    const { from, to } = candidateWindow(fields.date);
    const candidates = await txRepo.listTransactionsBetween(db, from, to);
    return matchFields(decideMatch(fields, candidates, linked));
  };

  const ingestOnce = async () => {
    const rules = await repo.listOriginRules(db);
    const merchants = await repo.listMerchantRules(db);
    // Lançamentos já ligados a capturas; cresce a cada sugestão para duas capturas não
    // disputarem o mesmo lançamento.
    const linked = await repo.listLinkedTransactionIds(db);
    let created = 0;
    for (;;) {
      const batch = await deps.notifications.getPending(INGEST_BATCH);
      if (batch.length === 0) break;
      for (const raw of batch) {
        const fields = applyMerchantRule(
          buildCapture(raw, parseNotification(deps.parsers, raw), rules),
          merchants,
        );
        const match = await suggestLink(fields, linked);
        if (await repo.insertCapture(db, { ...fields, ...match })) {
          created++;
          if (match.matchTransactionId) linked.add(match.matchTransactionId);
        }
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

    async ingestReceipt({ text, receivedAtMs }) {
      const built = buildReceiptCapture(text, receivedAtMs, await listAccounts(db));
      if (!built) throw new DomainError('receipt_unrecognized');
      const fields = applyMerchantRule(built, await repo.listMerchantRules(db));
      const existing = await repo.getByRawId(db, fields.rawId);
      if (existing) return existing;
      const match = await suggestLink(fields, await repo.listLinkedTransactionIds(db));
      await repo.insertCapture(db, { ...fields, ...match });
      return (await repo.getByRawId(db, fields.rawId))!;
    },

    listPending: () => repo.listByStatus(db, 'pending'),
    countPending: () => repo.countByStatus(db, 'pending'),
    listRecent: (limit) => repo.listRecent(db, limit),
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
          source: capture.channel === 'receipt' ? 'receipt' : 'notification',
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
            source: capture.channel === 'receipt' ? 'receipt' : 'notification',
          }),
        ];
      }

      await repo.updateCapture(db, id, {
        status: 'confirmed',
        transactionId: created[0].id,
        editedOnConfirm: confirmationEdited(capture, input),
      });
      const merchantRule = learnedMerchantRule(capture, confirmation);
      if (merchantRule) await repo.upsertMerchantRule(db, merchantRule);
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

    async linkCapture(id, transactionId) {
      const capture = await requirePending(id);
      const tx = await deps.transactions.getTransaction(transactionId);
      if (!tx) throw new DomainError('not_found', `Lançamento não encontrado: ${transactionId}`);
      if (
        (await repo.listLinkedTransactionIds(db)).has(tx.id) &&
        capture.matchTransactionId !== tx.id
      ) {
        throw new DomainError('already_linked');
      }
      await repo.updateCapture(db, id, {
        status: 'confirmed',
        transactionId: tx.id,
        matchTransactionId: tx.id,
        editedOnConfirm: capture.matchTransactionId !== tx.id,
      });
      await repo.upsertOriginRule(db, linkedRule(capture, tx));
      const merchantRule = learnedMerchantRule(capture, tx);
      if (merchantRule) await repo.upsertMerchantRule(db, merchantRule);
      return tx;
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
