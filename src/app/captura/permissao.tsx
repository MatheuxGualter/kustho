import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

/** Trilha B (Fase 2): explicar o que é lido, liberar o acesso e a bateria. */
export default function CaptureSetupScreen() {
  return (
    <Screen title={strings.screens.captureSetup.title}>
      <Placeholder description={strings.screens.captureSetup.placeholder} />
    </Screen>
  );
}
