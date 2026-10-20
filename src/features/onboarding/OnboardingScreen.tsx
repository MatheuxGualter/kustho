import { router, Stack, usePreventRemove } from 'expo-router';
import { ChevronLeft, ChevronRight, CreditCard, Sparkles, User, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight, useReducedMotion } from 'react-native-reanimated';

import { DISPLAY_NAME_MAX, normalizeDisplayName, usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';
import { motion } from '@/ui/tokens';

const icons = [Sparkles, Zap, CreditCard, User];
const ICON_SIZE = 48;

/** Boas-vindas obrigatórias; o último passo pede o nome e segue para a primeira conta. */
export function OnboardingScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const finish = usePreferences((s) => s.finishOnboarding);
  const setDisplayName = usePreferences((s) => s.setDisplayName);
  const savedName = usePreferences((s) => s.displayName);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  /** `null` enquanto a pessoa não edita: o campo mostra o nome já salvo. */
  const [name, setName] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  /** Libera a saída só depois de concluir; o voltar do sistema não dispensa o fluxo. */
  const allowLeave = useRef(false);
  const consumedBack = useRef(false);
  const steps = strings.onboarding.steps;
  const last = step === steps.length - 1;
  const Icon = icons[step] ?? Sparkles;
  const shownName = name ?? savedName ?? '';
  const canFinish = normalizeDisplayName(shownName).length > 0;
  const entering = (direction === 'forward' ? SlideInRight : SlideInLeft).duration(
    reducedMotion ? 0 : motion.slow,
  );

  const retreat = useCallback(() => {
    if (consumedBack.current || step === 0) return;
    consumedBack.current = true;
    setDirection('back');
    setStep(step - 1);
    requestAnimationFrame(() => {
      consumedBack.current = false;
    });
  }, [step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowLeave.current) return false;
      retreat();
      return true;
    });
    return () => subscription.remove();
  }, [retreat]);

  const disablePrevention = usePreventRemove(!leaving, () => {
    if (allowLeave.current) return;
    retreat();
  });

  const finishFlow = () => {
    const trimmed = normalizeDisplayName(shownName);
    if (!trimmed) return;
    setDisplayName(trimmed);
    allowLeave.current = true;
    setLeaving(true);
    disablePrevention();
    if (usePreferences.getState().onboardingDone) {
      router.back();
      return;
    }
    finish();
    router.replace('/conta/nova');
  };

  const goForward = () => {
    if (last) {
      finishFlow();
      return;
    }
    setDirection('forward');
    setStep(step + 1);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: strings.screens.onboarding.title,
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Screen edges={['top', 'bottom']} scroll={false}>
        <View className="flex-1 justify-center">
          <Animated.View key={step} entering={entering} className="w-full items-center gap-6">
            <Icon size={ICON_SIZE} color={colors.brand} />
            <AppText variant="caption" tone="muted">
              {strings.onboarding.step(step + 1, steps.length)}
            </AppText>
            <StepDots count={steps.length} active={step} />
            <AppText variant="headline" className="text-center" accessibilityRole="header">
              {steps[step].title}
            </AppText>
            <AppText tone="muted" className="text-center">
              {steps[step].text}
            </AppText>
            {last ? (
              <View className="self-stretch">
                <TextField
                  label={strings.onboarding.nameLabel}
                  placeholder={strings.onboarding.namePlaceholder}
                  hint={strings.onboarding.nameHint}
                  value={shownName}
                  onChangeText={setName}
                  maxLength={DISPLAY_NAME_MAX}
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={finishFlow}
                />
              </View>
            ) : null}
          </Animated.View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={strings.onboarding.back}
              icon={ChevronLeft}
              variant="secondary"
              block
              disabled={step === 0}
              onPress={retreat}
            />
          </View>
          <View className="flex-1">
            <Button
              label={last ? strings.onboarding.start : strings.onboarding.next}
              icon={ChevronRight}
              iconPosition="right"
              block
              disabled={last && !canFinish}
              onPress={goForward}
            />
          </View>
        </View>
      </Screen>
    </>
  );
}

function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <View
      className="flex-row gap-2"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          className={`h-2 w-2 rounded-full ${index === active ? 'bg-brand' : 'bg-border'}`}
        />
      ))}
    </View>
  );
}
