import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useServices } from '@/services';

/**
 * Traz as notificações gravadas pelo módulo para a caixa de Pendentes: ao abrir o app e a
 * cada volta ao primeiro plano. Não desenha nada; fica no layout raiz.
 */
export function CaptureIngestor() {
  const { captures } = useServices();
  useEffect(() => {
    const ingest = () => void captures.ingest().catch(() => {});
    ingest();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') ingest();
    });
    return () => subscription.remove();
  }, [captures]);
  return null;
}
