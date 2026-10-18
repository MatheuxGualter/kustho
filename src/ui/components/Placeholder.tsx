import { View } from 'react-native';

import { strings } from '@/lib/strings';

import { AppText } from './AppText';

/** Conteúdo provisório das telas até as trilhas entregarem as seções reais. */
export function Placeholder({ description }: { description: string }) {
  return (
    <View className="gap-2 rounded-card border border-border bg-surface p-4">
      <AppText variant="label" tone="brand">
        {strings.common.comingSoon}
      </AppText>
      <AppText tone="muted">{description}</AppText>
    </View>
  );
}
