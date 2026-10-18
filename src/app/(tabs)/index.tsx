import { router } from 'expo-router';
import { useEffect } from 'react';

import { HomeAccountsSection } from '@/features/accounts/HomeAccountsSection';
import { HomeCardsSection } from '@/features/cards/HomeCardsSection';
import { HomeMonthSummary } from '@/features/overview/HomeMonthSummary';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { Screen } from '@/ui/components/Screen';

// Montada por seções que cada trilha entrega em src/features/<domínio>/ (dona: trilha D).
export default function HomeScreen() {
  const onboardingDone = usePreferences((s) => s.onboardingDone);

  useEffect(() => {
    if (!onboardingDone) router.push('/onboarding');
  }, [onboardingDone]);

  return (
    <Screen title={strings.screens.home.title}>
      <HomeAccountsSection />
      <HomeCardsSection />
      <HomeMonthSummary />
    </Screen>
  );
}
