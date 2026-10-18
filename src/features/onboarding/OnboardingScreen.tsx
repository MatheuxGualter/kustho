import { router, Stack } from 'expo-router';
import { CreditCard, Sparkles, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

const icons = [Sparkles, Zap, CreditCard];
const ICON_SIZE = 48;

/** Boas-vindas em três passos curtos; termina convidando a cadastrar a primeira conta. */
export function OnboardingScreen() {
  const { colors } = useTheme();
  const finish = usePreferences((s) => s.finishOnboarding);
  const [step, setStep] = useState(0);
  const steps = strings.onboarding.steps;
  const last = step === steps.length - 1;
  const Icon = icons[step];

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.onboarding.title, headerShown: false }} />
      <Screen edges={['top', 'bottom']}>
        <View className="items-center gap-6 py-8">
          <Icon size={ICON_SIZE} color={colors.brand} />
          <AppText variant="caption" tone="muted">
            {strings.onboarding.step(step + 1, steps.length)}
          </AppText>
          <AppText variant="headline" className="text-center" accessibilityRole="header">
            {steps[step].title}
          </AppText>
          <AppText tone="muted" className="text-center">
            {steps[step].text}
          </AppText>
        </View>
        <Button
          label={last ? strings.onboarding.createAccount : strings.onboarding.next}
          block
          onPress={() => {
            if (!last) return setStep(step + 1);
            finish();
            router.replace('/conta/nova');
          }}
        />
        <Button
          label={strings.onboarding.skip}
          variant="ghost"
          block
          onPress={() => {
            finish();
            router.back();
          }}
        />
      </Screen>
    </>
  );
}
