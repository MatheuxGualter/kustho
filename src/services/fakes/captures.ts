/**
 * Fake da trilha D (Fase 2) em memória. Usa as regras puras de `src/domain/captures/rules.ts`
 * e cria os lançamentos pelos serviços de lançamentos e cartões recebidos, então funciona
 * sobre os fakes (testes) e sobre os serviços reais (app, até a trilha D entregar o real).
 */
import type { NotificationCaptureApi } from '../../../modules/notification-capture/src/NotificationCapture.types';
import { createFromConfirmation } from '@/domain/captures/confirm';
import { decideMatch, type MatchableCapture, matchFields } from '@/domain/captures/matcher';
import {
  applyMerchantRule,
  confirmationEdited,
  learnedMerchantRule,
} from '@/domain/captures/merchantRules';
import {
  buildCapture,
  learnedRule,
  linkedRule,
  parseNotification,
  resolveConfirmation,
} from '@/domain/captures/rules';
import { shouldAutoConfirm, sourceStats } from '@/domain/captures/precision';
import { findDuplicate, findRefundTarget } from '@/domain/captures/special';
import type {
  AccountsService,
  CapturesService,
  CardsService,
  NotificationParser,
  TransactionsService,
} from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import { buildReceiptCapture } from '@/domain/receipts/capture';
import type {
  Capture,
  CaptureOriginRule,
  CaptureSource,
  MerchantRule,
  Transaction,
} from '@/domain/types';
import { nowTimestamp } from '@/lib/id';

import { notifyDataChanged } from '../dataVersion';
import { entity } from './common';

export type CaptureStore = {
  captures: Capture[];
  originRules: CaptureOriginRule[];
  merchantRules: MerchantRule[];
  sources: CaptureSource[];
};

export const createCaptureStore = (): CaptureStore => ({
  captures: [],
  originRules: [],
  merchantRules: [],
  sources: [],
});

/** Quantas notificações cruas o `ingest` lê por vez. */
const INGEST_BATCH = 100;

export function createFakeCapturesService(
  store: CaptureStore,
  deps: {
    transactions: TransactionsService;
    /** Para sugerir a conta de um comprovante pelo banco (trilha E). */
    accounts?: AccountsService;
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

  const learnMerchant = (rule: ReturnType<typeof learnedMerchantRule>) => {
    if (!rule) return;
    const existing = store.merchantRules.find((r) => r.merchantKey === rule.merchantKey);
    if (existing) {
      Object.assign(existing, rule, { hits: existing.hits + 1, updatedAt: nowTimestamp() });
    } else {
      store.merchantRules.push({ ...entity(), ...rule, hits: 1 });
    }
  };

  /** Lançamentos já ligados (confirmados) ou sugeridos (pendentes) a uma captura. */
  const linkedIds = () => {
    const ids = new Set<string>();
    for (const c of store.captures) {
      if (c.deletedAt !== null) continue;
      if (c.transactionId) ids.add(c.transactionId);
      if (c.status === 'pending' && c.kind !== 'card_refund' && c.matchTransactionId) {
        ids.add(c.matchTransactionId);
      }
    }
    return ids;
  };

  /** Vínculo sugerido (trilha A) ou, em estorno, a compra que ele devolve (trilha C). */
  const suggestLink = async (fields: MatchableCapture, transactions: readonly Transaction[]) => {
    if (fields.kind !== 'card_refund') {
      return matchFields(decideMatch(fields, transactions, linkedIds()));
    }
    const options = await Promise.all(
      transactions
        .filter((tx) => tx.kind === 'card_purchase')
        .map(async (tx) => ({
          tx,
          refundableCents: await deps.cards.getRefundableCents(tx.id),
        })),
    );
    return matchFields(findRefundTarget(fields, options));
  };

  // Como no real: duas leituras ao mesmo tempo esperam a mesma.
  let running: Promise<number> | null = null;
  const getSourceStats = async () => sourceStats(store.captures, store.sources);

  const ingestOnce = async () => {
    const transactions = await deps.transactions.listAllTransactions();
    // Nível automático (trilha D): a precisão é a do início da leitura.
    const stats = new Map((await getSourceStats()).map((s) => [s.packageName, s]));
    const toAutoConfirm: Capture[] = [];
    let created = 0;
    for (;;) {
      const batch = await deps.notifications.getPending(INGEST_BATCH);
      if (batch.length === 0) break;
      for (const raw of batch) {
        if (store.captures.some((c) => c.rawId === raw.id)) continue;
        const fields = applyMerchantRule(
          buildCapture(raw, parseNotification(parsers, raw), store.originRules),
          store.merchantRules,
        );
        const duplicate = findDuplicate(fields, store.captures);
        if (duplicate) {
          // Fica descartada, apontando a original: um item só em Pendentes.
          store.captures.push({
            ...entity(),
            ...fields,
            status: 'discarded',
            duplicateOfId: duplicate.id,
          });
        } else {
          const capture: Capture = {
            ...entity(),
            ...fields,
            ...(await suggestLink(fields, transactions)),
          };
          store.captures.push(capture);
          if (shouldAutoConfirm(capture, stats.get(capture.packageName))) {
            toAutoConfirm.push(capture);
          }
        }
        created++;
      }
      await deps.notifications.markProcessed(batch.map((raw) => raw.id));
      if (batch.length < INGEST_BATCH) break;
    }
    for (const capture of toAutoConfirm) {
      await service.confirmCapture(capture.id);
      capture.autoConfirmed = true;
    }
    if (created > 0) notifyDataChanged();
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
      const accounts = deps.accounts ? await deps.accounts.listAccountsWithBalance() : [];
      const built = buildReceiptCapture(text, receivedAtMs, accounts);
      if (!built) throw new DomainError('receipt_unrecognized');
      const fields = applyMerchantRule(built, store.merchantRules);
      const existing = store.captures.find((c) => c.rawId === fields.rawId && c.deletedAt === null);
      if (existing) {
        const original = store.captures.find((c) => c.id === existing.duplicateOfId);
        return original ?? existing;
      }
      const duplicate = findDuplicate(fields, store.captures);
      if (duplicate) {
        store.captures.push({
          ...entity(),
          ...fields,
          status: 'discarded',
          duplicateOfId: duplicate.id,
        });
        notifyDataChanged();
        return duplicate;
      }
      const transactions = await deps.transactions.listAllTransactions();
      const capture: Capture = {
        ...entity(),
        ...fields,
        ...(await suggestLink(fields, transactions)),
      };
      store.captures.push(capture);
      notifyDataChanged();
      return capture;
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

      const created = await createFromConfirmation(deps, capture, confirmation);

      Object.assign(capture, {
        status: 'confirmed',
        transactionId: created[0].id,
        editedOnConfirm: confirmationEdited(capture, input),
        updatedAt: nowTimestamp(),
      });
      // Estorno não ensina origem nem categoria: quem ensina é a compra.
      if (confirmation.kind !== 'card_refund') {
        remember(learnedRule(capture, confirmation));
        learnMerchant(learnedMerchantRule(capture, confirmation));
      }
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
      learnMerchant(learnedMerchantRule(capture, tx));
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

    getSourceStats,

    async setAutoConfirm(packageName, enabled) {
      if (enabled) {
        const stats = (await getSourceStats()).find((s) => s.packageName === packageName);
        if (!stats?.eligible) throw new DomainError('auto_confirm_not_eligible');
      }
      const existing = store.sources.find((s) => s.packageName === packageName);
      if (existing) {
        Object.assign(existing, {
          autoConfirm: enabled,
          deletedAt: null,
          updatedAt: nowTimestamp(),
        });
      } else {
        store.sources.push({ ...entity(), packageName, autoConfirm: enabled });
      }
      notifyDataChanged();
    },

    async listAutoConfirmed(since) {
      return store.captures
        .filter(
          (c) =>
            c.deletedAt === null &&
            c.status === 'confirmed' &&
            c.autoConfirmed &&
            c.postedAt >= since,
        )
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    },

    async undoAutoConfirm(id) {
      const capture = live(id);
      if (capture.status !== 'confirmed' || !capture.autoConfirmed) {
        throw new DomainError('not_found');
      }
      // Exclui o lançamento junto com as parcelas do grupo.
      if (capture.transactionId) await deps.transactions.deleteTransaction(capture.transactionId);
      Object.assign(capture, {
        status: 'pending',
        transactionId: null,
        autoConfirmed: false,
        updatedAt: nowTimestamp(),
      });
      notifyDataChanged();
    },
  };
  return service;
}
