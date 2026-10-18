import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { formatBRL } from '@/lib/money';
import { strings } from '@/lib/strings';
import { AppText, type AppTextVariant } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';
import { ThemeSelector } from '@/ui/components/ThemeSelector';
import { useTheme } from '@/ui/theme';
import { accentPalette, colorTokenNames, spacing } from '@/ui/tokens';

const typeScale: AppTextVariant[] = ['display', 'headline', 'title', 'body', 'label', 'caption'];

/**
 * Catálogo de componentes (só em debug). A trilha D da Fase 0 acrescenta aqui
 * MoneyText, botões, inputs, cards, TransactionRow e AmountKeypad.
 */
export default function DevCatalogScreen() {
  const { colors } = useTheme();
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen edges={['bottom']}>
      <ThemeSelector />

      <Section title={strings.devCatalog.colors}>
        <View className="flex-row flex-wrap gap-2">
          {colorTokenNames.map((name) => (
            <View key={name} className="w-[30%] gap-1">
              <View
                className="h-fab rounded-input border border-border"
                style={{ backgroundColor: colors[name] }}
              />
              <AppText variant="caption">{name}</AppText>
              <AppText variant="caption" tone="muted">
                {colors[name]}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title={strings.devCatalog.accents}>
        <View className="flex-row flex-wrap gap-2">
          {accentPalette.map((color) => (
            <View
              key={color}
              className="h-fab w-fab rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </View>
      </Section>

      <Section title={strings.devCatalog.typography}>
        {typeScale.map((variant) => (
          <AppText key={variant} variant={variant} numberOfLines={1}>
            {variant === 'display'
              ? formatBRL(1234567)
              : `${variant} · ${strings.devCatalog.sample}`}
          </AppText>
        ))}
        <View className="flex-row gap-4">
          <AppText numeric tone="income">
            {formatBRL(459000, { sign: 'always' })}
          </AppText>
          <AppText numeric tone="expense">
            {formatBRL(-4590)}
          </AppText>
        </View>
      </Section>

      <Section title={strings.devCatalog.spacing}>
        {Object.entries(spacing)
          .filter(([, value]) => value > 0)
          .map(([key, value]) => (
            <View key={key} className="flex-row items-center gap-2">
              <View className="h-2 rounded-input bg-brand" style={{ width: value * 4 }} />
              <AppText variant="caption" tone="muted">
                {value}
              </AppText>
            </View>
          ))}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-card border border-border bg-surface p-4">
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}
