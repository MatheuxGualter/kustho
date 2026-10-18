import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  NotificationCapture,
  type NotificationCaptureApi,
} from '../../../modules/notification-capture';
import { type CaptureDeviceState, captureHealth } from '@/domain/captures/health';

/** O módulo nativo, ou um fake nos testes. `null` onde ele não existe (iOS, web). */
const CaptureModuleContext = createContext<NotificationCaptureApi | null>(NotificationCapture);

export function CaptureModuleProvider({
  module,
  children,
}: {
  module: NotificationCaptureApi | null;
  children: ReactNode;
}) {
  return <CaptureModuleContext.Provider value={module}>{children}</CaptureModuleContext.Provider>;
}

function readState(module: NotificationCaptureApi | null): CaptureDeviceState {
  if (!module) {
    return {
      available: false,
      permissionGranted: false,
      ignoringBatteryOptimizations: false,
      allowedPackages: [],
    };
  }
  return {
    available: true,
    permissionGranted: module.isPermissionGranted(),
    ignoringBatteryOptimizations: module.isIgnoringBatteryOptimizations(),
    allowedPackages: module.getAllowedPackages(),
  };
}

/**
 * Estado da captura no aparelho (acesso, bateria, apps lidos). Relê ao voltar das
 * configurações do sistema, que é onde o usuário muda essas coisas.
 */
export function useCaptureDevice() {
  const module = useContext(CaptureModuleContext);
  const [state, setState] = useState(() => readState(module));

  const refresh = useCallback(() => setState(readState(module)), [module]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const setAllowedPackages = useCallback(
    (packages: string[]) => {
      module?.setAllowedPackages(packages);
      refresh();
    },
    [module, refresh],
  );

  return { module, state, health: captureHealth(state), refresh, setAllowedPackages };
}
