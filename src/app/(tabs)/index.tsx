import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

// Montada por seções que cada trilha entrega em src/features/<domínio>/
// (HomeAccountsSection, HomeCardsSection, HomeMonthSummary…).
export default function HomeScreen() {
  return (
    <Screen title={strings.screens.home.title}>
      <Placeholder description={strings.screens.home.placeholder} />
    </Screen>
  );
}
