import { useEffect } from 'react';
import { AppState } from 'react-native';

import { NotificationCapture } from '../../../modules/notification-capture';
import { useServices } from '@/services';

/**
 * Traz as notificações gravadas pelo módulo para a caixa de Pendentes: ao abrir o app, a
 * cada volta ao primeiro plano e, com o app aberto, a cada notificação gravada. Não desenha
 * nada; fica no layout raiz.
 */
export function CaptureIngestor() {
  const { captures } = useServices();
  useEffect(() => {
    const ingest = () => void captures.ingest().catch(() => {});
    // O sistema às vezes derruba o serviço de captura; pedir religação ao abrir é barato.
    const wake = () => {
      if (NotificationCapture?.isPermissionGranted()) NotificationCapture.requestRebind();
      ingest();
    };
    wake();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') wake();
    });
    const captured = NotificationCapture?.addListener('onCaptured', ingest);
    return () => {
      appState.remove();
      captured?.remove();
    };
  }, [captures]);
  return null;
}
