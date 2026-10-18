import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

/** Trilha B (Fase 2): saúde do serviço e exportação anonimizada. */
export default function CaptureDiagnosticsScreen() {
  return (
    <Screen title={strings.screens.captureDiagnostics.title}>
      <Placeholder description={strings.screens.captureDiagnostics.placeholder} />
    </Screen>
  );
}
