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
import type { Capture } from '@/domain/types';

import { createFromConfirmation } from './confirm';
import { applyMerchantRule, confirmationEdited, learnedMerchantRule } from './merchantRules';
import { candidateWindow, decideMatch, type MatchableCapture, matchFields } from './matcher';
import {
  buildCapture,
  learnedRule,
  linkedRule,
  parseNotification,
  resolveConfirmation,
} from './rules';
import { duplicateWindow, findDuplicate, findRefundTarget, refundWindow } from './special';

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
  /**
   * Sugestão de vínculo (trilha A) para uma captura ainda não gravada; em estorno, a compra
   * que ele devolve (trilha C).
   */
  const suggestLink = async (fields: MatchableCapture, linked: ReadonlySet<string>) => {
    if (!fields.date || !fields.amountCents) return matchFields({ action: 'create', score: 0 });
    if (fields.kind === 'card_refund') {
      const { from, to } = refundWindow(fields.date);
      const purchases = (await txRepo.listTransactionsBetween(db, from, to)).filter(
        (tx) => tx.kind === 'card_purchase',
      );
      const options = await Promise.all(
        purchases.map(async (tx) => ({
          tx,
          refundableCents: await deps.cards.getRefundableCents(tx.id),
        })),
      );
      return matchFields(findRefundTarget(fields, options));
    }
    const { from, to } = candidateWindow(fields.date);
    const candidates = await txRepo.listTransactionsBetween(db, from, to);
    return matchFields(decideMatch(fields, candidates, linked));
  };

  /** A mesma transação já capturada por outra fonte (trilha C). */
  const duplicateOf = async (
    fields: Omit<Capture, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ) => {
    const { from, to } = duplicateWindow(fields.postedAt);
    return findDuplicate(fields, await repo.listPostedBetween(db, from, to));
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
        const duplicate = await duplicateOf(fields);
        if (duplicate) {
          // Fica descartada, apontando a original: um item só em Pendentes.
          const inserted = await repo.insertCapture(db, {
            ...fields,
            status: 'discarded',
            duplicateOfId: duplicate.id,
          });
          if (inserted) created++;
          continue;
        }
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
      if (existing) {
        return (
          (existing.duplicateOfId && (await repo.getCapture(db, existing.duplicateOfId))) ||
          existing
        );
      }
      const duplicate = await duplicateOf(fields);
      if (duplicate) {
        await repo.insertCapture(db, {
          ...fields,
          status: 'discarded',
          duplicateOfId: duplicate.id,
        });
        return duplicate;
      }
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

      const created = await createFromConfirmation(deps, capture, confirmation);

      await repo.updateCapture(db, id, {
        status: 'confirmed',
        transactionId: created[0].id,
        editedOnConfirm: confirmationEdited(capture, input),
      });
      // Estorno não ensina origem nem categoria: quem ensina é a compra.
      if (confirmation.kind !== 'card_refund') {
        const merchantRule = learnedMerchantRule(capture, confirmation);
        if (merchantRule) await repo.upsertMerchantRule(db, merchantRule);
        await repo.upsertOriginRule(db, learnedRule(capture, confirmation));
      }
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
