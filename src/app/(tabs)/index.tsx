import { HomeAccountsSection } from '@/features/accounts/HomeAccountsSection';
import { HomeCardsSection } from '@/features/cards/HomeCardsSection';
import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

// Montada por seções que cada trilha entrega em src/features/<domínio>/.
// Dona da tela: trilha D. Próxima: HomeMonthSummary (D).
export default function HomeScreen() {
  return (
    <Screen title={strings.screens.home.title}>
      <HomeAccountsSection />
      <HomeCardsSection />
      <Placeholder description={strings.screens.home.placeholder} />
    </Screen>
  );
}
