import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/ui/theme';

import { AppText } from './AppText';
import { Button } from './Button';

const ICON_SIZE = 32;

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
};

/** Nunca uma tela em branco: explica o vazio e sugere o próximo passo. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View className="items-center gap-3 px-6 py-8">
      <Icon size={ICON_SIZE} color={colors['text-muted']} />
      <AppText variant="title" className="text-center">
        {title}
      </AppText>
      {description ? (
        <AppText tone="muted" className="text-center">
          {description}
        </AppText>
      ) : null}
      {action ? (
        <View className="mt-4">
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
