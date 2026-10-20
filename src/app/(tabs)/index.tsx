import { router } from 'expo-router';
import { useEffect } from 'react';

import { HomeAccountsSection } from '@/features/accounts/HomeAccountsSection';
import { HomeCaptureNotice } from '@/features/capture-setup/HomeCaptureNotice';
import { HomeCardsSection } from '@/features/cards/HomeCardsSection';
import { HomeMonthSummary } from '@/features/overview/HomeMonthSummary';
import { dayPeriod } from '@/lib/dates';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { Screen } from '@/ui/components/Screen';

// Montada por seções que cada trilha entrega em src/features/<domínio>/ (dona: trilha D).
export default function HomeScreen() {
  const onboardingDone = usePreferences((s) => s.onboardingDone);
  const displayName = usePreferences((s) => s.displayName);
  const name = displayName || strings.screens.home.greetingName;

  useEffect(() => {
    if (!onboardingDone) router.push('/onboarding');
  }, [onboardingDone]);

  return (
    <Screen
      topFade
      title={`${strings.screens.home.greetings[dayPeriod(new Date().getHours())]}, ${name.trim().split(' ')[0]}!`}
    >
      <HomeCaptureNotice />
      <HomeAccountsSection />
      <HomeCardsSection />
      <HomeMonthSummary />
    </Screen>
  );
}
