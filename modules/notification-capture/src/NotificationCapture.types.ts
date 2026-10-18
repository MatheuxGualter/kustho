/**
 * Contrato do módulo de captura (Fase 2, trilha A). Mudou algo aqui? Avise o grupo: as
 * trilhas B, C e D usam o fake (`createFakeNotificationCapture`) com esta mesma interface.
 *
 * O Kotlin só lê e guarda notificações; toda interpretação acontece em TypeScript.
 */
import type { EventSubscription } from 'expo';

/** Notificação como o Android entregou, sem interpretação. */
export type RawNotification = {
  /** UUID gerado pelo módulo ao gravar. */
  id: string;
  /** `StatusBarNotification.key`: a mesma notificação pode ser atualizada pelo app do banco. */
  key: string;
  /** Pacote do app que postou (ex.: `com.nu.production`). */
  packageName: string;
  title: string | null;
  /** Texto mais completo disponível (texto expandido, se houver; senão o texto curto). */
  text: string | null;
  /** Quando o app do banco postou, em milissegundos desde 1970 (UTC). */
  postedAtMs: number;
  /** Quando o módulo gravou, em milissegundos desde 1970 (UTC). */
  capturedAtMs: number;
};

export type NotificationCaptureEvents = {
  /** Uma notificação nova foi gravada (só chega com o app aberto; as demais ficam pendentes). */
  onCaptured: (notification: RawNotification) => void;
};

export interface NotificationCaptureApi {
  /** O usuário liberou o acesso a notificações para o Kustho. */
  isPermissionGranted(): boolean;
  /** Abre a tela do sistema onde o acesso a notificações é liberado. */
  openPermissionSettings(): void;
  isIgnoringBatteryOptimizations(): boolean;
  /** Pede ao sistema para não encerrar o serviço em segundo plano. */
  requestIgnoreBatteryOptimizations(): void;
  /**
   * Pede ao Android para religar o serviço de captura (o sistema às vezes o derruba).
   * Chamar ao abrir o app quando a permissão está dada.
   */
  requestRebind(): void;
  /** Só notificações destes pacotes são gravadas. Substitui a lista anterior. */
  setAllowedPackages(packages: string[]): void;
  getAllowedPackages(): string[];
  /** Notificações ainda não processadas, da mais antiga para a mais nova. */
  getPending(limit: number): Promise<RawNotification[]>;
  /** Marca como processadas (o domínio já criou as `captures` delas). */
  markProcessed(ids: string[]): Promise<void>;
  addListener<E extends keyof NotificationCaptureEvents>(
    eventName: E,
    listener: NotificationCaptureEvents[E],
  ): EventSubscription;
}
