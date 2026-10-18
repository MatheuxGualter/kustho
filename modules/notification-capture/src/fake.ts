import type { EventSubscription } from 'expo';

import type {
  NotificationCaptureApi,
  NotificationCaptureEvents,
  RawNotification,
} from './NotificationCapture.types';

export type PostedNotification = {
  packageName: string;
  title?: string | null;
  text?: string | null;
  /** Padrão: `packageName|título|texto`, como uma notificação nova a cada conteúdo. */
  key?: string;
  postedAtMs?: number;
};

export type FakeNotificationCapture = NotificationCaptureApi & {
  /**
   * Simula o app de um banco postando uma notificação. Segue as regras do módulo real:
   * pacote fora da lista é ignorado e a mesma `key` com o mesmo conteúdo não grava de novo.
   * Devolve o que foi gravado, ou `null`.
   */
  post(notification: PostedNotification): RawNotification | null;
  /** Estado das permissões, para testar as telas de B. */
  permissionGranted: boolean;
  ignoringBatteryOptimizations: boolean;
};

/**
 * Módulo de captura em memória, com a mesma interface do nativo. Usado nos testes e
 * pelas trilhas B, C e D até o módulo Kotlin ficar pronto.
 */
export function createFakeNotificationCapture(
  options: { allowedPackages?: string[]; now?: () => number } = {},
): FakeNotificationCapture {
  const now = options.now ?? Date.now;
  let allowed = new Set(options.allowedPackages ?? []);
  const stored: (RawNotification & { processed: boolean })[] = [];
  const listeners = new Set<NotificationCaptureEvents['onCaptured']>();
  let nextId = 1;

  const fake: FakeNotificationCapture = {
    permissionGranted: false,
    ignoringBatteryOptimizations: false,

    isPermissionGranted: () => fake.permissionGranted,
    openPermissionSettings: () => {},
    isIgnoringBatteryOptimizations: () => fake.ignoringBatteryOptimizations,
    requestIgnoreBatteryOptimizations: () => {},
    requestRebind: () => {},

    setAllowedPackages(packages) {
      allowed = new Set(packages);
    },
    getAllowedPackages: () => [...allowed],

    async getPending(limit) {
      return stored
        .filter((n) => !n.processed)
        .slice(0, limit)
        .map(({ processed: _, ...n }) => n);
    },

    async markProcessed(ids) {
      const set = new Set(ids);
      for (const n of stored) if (set.has(n.id)) n.processed = true;
    },

    addListener(_eventName, listener): EventSubscription {
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },

    post(input) {
      if (!allowed.has(input.packageName)) return null;
      const title = input.title ?? null;
      const text = input.text ?? null;
      const key = input.key ?? `${input.packageName}|${title}|${text}`;
      const duplicate = stored.some((n) => n.key === key && n.title === title && n.text === text);
      if (duplicate) return null;

      const capturedAtMs = now();
      const notification: RawNotification = {
        id: `fake-${nextId++}`,
        key,
        packageName: input.packageName,
        title,
        text,
        postedAtMs: input.postedAtMs ?? capturedAtMs,
        capturedAtMs,
      };
      stored.push({ ...notification, processed: false });
      for (const listener of listeners) listener(notification);
      return notification;
    },
  };
  return fake;
}
