import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

// Trilha B da Fase 1: sheet com AmountKeypad, descrição e origem visíveis de cara.
export default function NewTransactionScreen() {
  return (
    <Screen title={strings.screens.newTransaction.title} edges={['top', 'bottom']}>
      <Placeholder description={strings.screens.newTransaction.title} />
    </Screen>
  );
}
