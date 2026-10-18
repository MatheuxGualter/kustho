import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

/** Trilha D (Fase 2): caixa de Pendentes. Dados em `useServices().captures`. */
export default function PendingScreen() {
  return (
    <Screen title={strings.screens.pending.title}>
      <Placeholder description={strings.screens.pending.placeholder} />
    </Screen>
  );
}
