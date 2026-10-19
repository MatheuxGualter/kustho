/**
 * Nível automático por fonte (Fase 3, trilha D): precisão = confirmadas sem edição ÷
 * confirmadas pelo usuário. A chave "lançar automaticamente" só liga com amostra mínima e
 * precisão de 95% (portão da fase), e só lança sozinho o que viria pronto para confirmar.
 */
import type { SourceStats } from '@/domain/contracts';
import type { Capture, CaptureSource } from '@/domain/types';

import { resolveConfirmation } from './rules';

export const AUTO_CONFIRM_MIN_PRECISION = 0.95;
/** Confirmações do usuário na fonte antes de liberar a chave. */
export const AUTO_CONFIRM_MIN_SAMPLE = 20;

type StatsCapture = Pick<
  Capture,
  'packageName' | 'status' | 'editedOnConfirm' | 'autoConfirmed' | 'deletedAt'
>;

/**
 * Estatística de cada fonte que já teve captura confirmada ou tem configuração. Só contam
 * as confirmações feitas pelo usuário: as automáticas não provam nada.
 */
export function sourceStats(
  captures: readonly StatsCapture[],
  sources: readonly Pick<CaptureSource, 'packageName' | 'autoConfirm' | 'deletedAt'>[],
): SourceStats[] {
  const counts = new Map<string, { confirmed: number; unedited: number }>();
  const bucket = (packageName: string) => {
    let entry = counts.get(packageName);
    if (!entry) counts.set(packageName, (entry = { confirmed: 0, unedited: 0 }));
    return entry;
  };
  for (const c of captures) {
    if (c.deletedAt !== null || c.status !== 'confirmed' || c.autoConfirmed) continue;
    const entry = bucket(c.packageName);
    entry.confirmed++;
    if (!c.editedOnConfirm) entry.unedited++;
  }
  const live = sources.filter((s) => s.deletedAt === null);
  for (const s of live) bucket(s.packageName);

  return [...counts.entries()]
    .map(([packageName, { confirmed, unedited }]) => {
      const precision = confirmed > 0 ? unedited / confirmed : null;
      return {
        packageName,
        confirmed,
        unedited,
        precision,
        eligible:
          confirmed >= AUTO_CONFIRM_MIN_SAMPLE &&
          precision !== null &&
          precision >= AUTO_CONFIRM_MIN_PRECISION,
        autoConfirm: live.find((s) => s.packageName === packageName)?.autoConfirm ?? false,
      };
    })
    .sort((a, b) => b.confirmed - a.confirmed || a.packageName.localeCompare(b.packageName));
}

/**
 * Lançar sozinho? Fonte com a chave ligada **e** ainda acima do portão; captura
 * interpretada, completa, sem sugestão de vínculo (o usuário escolhe) e que não seja
 * estorno nem duplicata.
 */
export function shouldAutoConfirm(capture: Capture, stats: SourceStats | undefined): boolean {
  return (
    !!stats?.autoConfirm &&
    stats.eligible &&
    capture.status === 'pending' &&
    capture.parser !== null &&
    capture.kind !== 'card_refund' &&
    capture.matchTransactionId === null &&
    capture.duplicateOfId === null &&
    resolveConfirmation(capture, {}) !== null
  );
}
