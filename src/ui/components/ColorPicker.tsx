import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { strings } from '@/lib/strings';
import { useTheme } from '@/ui/theme';
import { accentPalette } from '@/ui/tokens';

import { AppText } from './AppText';

const CHECK_SIZE = 20;

/** Escolha de uma das 10 cores de conta, cartão ou categoria. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { colors } = useTheme();
  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {strings.fields.color}
      </AppText>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {accentPalette.map((color, i) => {
          const selected = color === value;
          return (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityLabel={strings.fields.colorOption(i + 1)}
              accessibilityState={{ selected }}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(color);
              }}
              className={`h-fab w-fab items-center justify-center rounded-full ${selected ? 'border-2 border-text' : ''}`}
              style={{ backgroundColor: color }}
            >
              {selected ? <Check size={CHECK_SIZE} color={colors['on-brand']} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
