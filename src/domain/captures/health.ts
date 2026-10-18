/**
 * Saúde da captura (Fase 2, trilha B): o que falta para as notificações chegarem, em
 * ordem de gravidade. Regras puras; as telas leem o estado do módulo nativo e chamam aqui.
 */

export type CaptureDeviceState = {
  /** O módulo nativo existe neste build (Android com o dev client atualizado). */
  available: boolean;
  permissionGranted: boolean;
  ignoringBatteryOptimizations: boolean;
  allowedPackages: readonly string[];
};

export type CaptureHealth =
  /** Sem o módulo: iOS, web ou dev client antigo. */
  | 'unavailable'
  /** Acesso a notificações não liberado (ou revogado). */
  | 'no_permission'
  /** Nenhum app de banco escolhido: nada é gravado. */
  | 'no_banks'
  /** Funciona, mas o sistema pode encerrar o serviço em segundo plano. */
  | 'battery'
  | 'ok';

export function captureHealth(state: CaptureDeviceState): CaptureHealth {
  if (!state.available) return 'unavailable';
  if (!state.permissionGranted) return 'no_permission';
  if (state.allowedPackages.length === 0) return 'no_banks';
  if (!state.ignoringBatteryOptimizations) return 'battery';
  return 'ok';
}

/**
 * Aviso na Início. Quem nunca configurou vê um convite (que pode dispensar); quem já
 * configurou é avisado quando a captura para de funcionar. Bateria não gera aviso: o
 * diagnóstico mostra.
 */
export function homeCaptureNotice(
  health: CaptureHealth,
  prefs: { setupDone: boolean; inviteDismissed: boolean },
): 'invite' | 'broken' | null {
  if (health === 'unavailable' || health === 'ok' || health === 'battery') return null;
  if (prefs.setupDone) return 'broken';
  return prefs.inviteDismissed ? null : 'invite';
}

/** Fabricantes com passo de bateria próprio (o resto usa o caminho do Android puro). */
export const batteryBrands = ['samsung', 'xiaomi', 'motorola', 'oppo', 'huawei'] as const;
export type BatteryBrand = (typeof batteryBrands)[number] | 'other';

/** `Platform.constants.Manufacturer` (ou `Brand`) → grupo de instruções de bateria. */
export function batteryBrand(manufacturer: string | null | undefined): BatteryBrand {
  const name = (manufacturer ?? '').toLowerCase();
  if (name.includes('samsung')) return 'samsung';
  if (/xiaomi|redmi|poco/.test(name)) return 'xiaomi';
  if (/motorola|lenovo/.test(name)) return 'motorola';
  if (/oppo|realme|oneplus/.test(name)) return 'oppo';
  if (/huawei|honor/.test(name)) return 'huawei';
  return 'other';
}
