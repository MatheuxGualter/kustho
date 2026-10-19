/**
 * Fake da trilha D (Fase 2) em memória. Usa as regras puras de `src/domain/captures/rules.ts`
 * e cria os lançamentos pelos serviços de lançamentos e cartões recebidos, então funciona
 * sobre os fakes (testes) e sobre os serviços reais (app, até a trilha D entregar o real).
 */
import type { NotificationCaptureApi } from '../../../modules/notification-capture/src/NotificationCapture.types';
import { decideMatch, matchFields } from '@/domain/captures/matcher';
import {
  buildCapture,
  learnedRule,
  linkedRule,
  parseNotification,
  resolveConfirmation,
} from '@/domain/captures/rules';
import type {
  CapturesService,
  CardsService,
  NotificationParser,
  TransactionsService,
} from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import type { Capture, CaptureOriginRule, Transaction } from '@/domain/types';
import { nowTimestamp } from '@/lib/id';

import { notifyDataChanged } from '../dataVersion';
import { entity } from './common';

export type CaptureStore = { captures: Capture[]; originRules: CaptureOriginRule[] };

export const createCaptureStore = (): CaptureStore => ({ captures: [], originRules: [] });

/** Quantas notificações cruas o `ingest` lê por vez. */
const INGEST_BATCH = 100;

export function createFakeCapturesService(
  store: CaptureStore,
  deps: {
    transactions: TransactionsService;
    cards: CardsService;
    /** Módulo nativo ou o fake dele. */
    notifications: NotificationCaptureApi;
    /** Parsers da trilha C; sem eles, toda captura entra como não interpretada. */
    parsers?: readonly NotificationParser[];
  },
): CapturesService {
  const parsers = deps.parsers ?? [];
  const live = (id: string) => {
    const capture = store.captures.find((c) => c.id === id && c.deletedAt === null);
    if (!capture) throw new DomainError('not_found', `Captura não encontrada: ${id}`);
    return capture;
  };
  const pending = () =>
    store.captures.filter((c) => c.deletedAt === null && c.status === 'pending');

  const remember = (rule: Omit<CaptureOriginRule, keyof ReturnType<typeof entity>>) => {
    const existing = store.originRules.find(
      (r) =>
        r.deletedAt === null &&
        r.packageName === rule.packageName &&
        r.cardLastDigits === rule.cardLastDigits,
    );
    if (existing) Object.assign(existing, rule, { updatedAt: nowTimestamp() });
    else store.originRules.push({ ...entity(), ...rule });
  };

  /** Lançamentos já ligados (confirmados) ou sugeridos (pendentes) a uma captura. */
  const linkedIds = () => {
    const ids = new Set<string>();
    for (const c of store.captures) {
      if (c.deletedAt !== null) continue;
      if (c.transactionId) ids.add(c.transactionId);
      if (c.status === 'pending' && c.matchTransactionId) ids.add(c.matchTransactionId);
    }
    return ids;
  };

  const service: CapturesService = {
    async ingest() {
      const transactions = await deps.transactions.listAllTransactions();
      let created = 0;
      for (;;) {
        const batch = await deps.notifications.getPending(INGEST_BATCH);
        if (batch.length === 0) break;
        for (const raw of batch) {
          if (store.captures.some((c) => c.rawId === raw.id)) continue;
          const fields = buildCapture(raw, parseNotification(parsers, raw), store.originRules);
          const match = matchFields(decideMatch(fields, transactions, linkedIds()));
          store.captures.push({ ...entity(), ...fields, ...match });
          created++;
        }
        await deps.notifications.markProcessed(batch.map((raw) => raw.id));
        if (batch.length < INGEST_BATCH) break;
      }
      if (created > 0) notifyDataChanged();
      return created;
    },

    async listPending() {
      return pending().sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    },

    async countPending() {
      return pending().length;
    },

    async listRecent(limit) {
      return store.captures
        .filter((c) => c.deletedAt === null)
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
        .slice(0, limit);
    },

    async getCapture(id) {
      return store.captures.find((c) => c.id === id && c.deletedAt === null);
    },

    async confirmCapture(id, input = {}) {
      const capture = live(id);
      if (capture.status !== 'pending') throw new DomainError('not_found');
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

      Object.assign(capture, {
        status: 'confirmed',
        transactionId: created[0].id,
        updatedAt: nowTimestamp(),
      });
      remember(learnedRule(capture, confirmation));
      notifyDataChanged();
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
      const capture = live(id);
      if (capture.status !== 'pending') throw new DomainError('not_found');
      const tx = await deps.transactions.getTransaction(transactionId);
      if (!tx) throw new DomainError('not_found');
      if (linkedIds().has(tx.id) && capture.matchTransactionId !== tx.id) {
        throw new DomainError('already_linked');
      }
      Object.assign(capture, {
        status: 'confirmed',
        transactionId: tx.id,
        matchTransactionId: tx.id,
        editedOnConfirm: capture.matchTransactionId !== tx.id,
        updatedAt: nowTimestamp(),
      });
      remember(linkedRule(capture, tx));
      notifyDataChanged();
      return tx;
    },

    async discardCapture(id) {
      const capture = live(id);
      if (capture.status !== 'pending') throw new DomainError('not_found');
      Object.assign(capture, { status: 'discarded', updatedAt: nowTimestamp() });
      notifyDataChanged();
    },

    async restoreCapture(id) {
      const capture = live(id);
      if (capture.status !== 'discarded') return;
      Object.assign(capture, { status: 'pending', updatedAt: nowTimestamp() });
      notifyDataChanged();
    },
  };
  return service;
}
