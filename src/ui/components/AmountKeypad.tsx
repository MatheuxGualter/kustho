import * as Haptics from 'expo-haptics';
import { Delete } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { appendDigit, type Cents, removeLastDigit } from '@/lib/money';
import { strings } from '@/lib/strings';
import { useTheme } from '@/ui/theme';

import { AppText } from './AppText';

export type KeypadKey =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | 'backspace';

/** Aplica uma tecla ao valor em centavos: digitar 4, 5, 9, 0 → 4590 (R$ 45,90). */
export function applyKey(cents: Cents, key: KeypadKey): Cents {
  if (key === 'backspace') return removeLastDigit(cents);
  if (key === '00') return appendDigit(appendDigit(cents, 0), 0);
  return appendDigit(cents, Number(key));
}

const rows: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', 'backspace'],
];

const ICON_SIZE = 24;

export type AmountKeypadProps = {
  value: Cents;
  onChange: (cents: Cents) => void;
};

/** Teclado próprio em centavos para o novo lançamento, com vibração leve. */
export function AmountKeypad({ value, onChange }: AmountKeypadProps) {
  const { colors } = useTheme();

  const press = (key: KeypadKey) => {
    const next = applyKey(value, key);
    if (next === value) return;
    void Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View className="gap-2" accessibilityHint={strings.keypad.hint}>
      {rows.map((row) => (
        <View key={row.join()} className="flex-row gap-2">
          {row.map((key) => (
            <Pressable
              key={key}
              testID={`keypad-${key}`}
              accessibilityRole="button"
              accessibilityLabel={
                key === 'backspace'
                  ? strings.keypad.backspace
                  : key === '00'
                    ? strings.keypad.doubleZero
                    : key
              }
              onPress={() => press(key)}
              onLongPress={
                key === 'backspace'
                  ? () => {
                      if (value === 0) return;
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onChange(0);
                    }
                  : undefined
              }
              className="min-h-touch flex-1 items-center justify-center rounded-input bg-surface-raised py-3 active:opacity-60"
            >
              {key === 'backspace' ? (
                <Delete size={ICON_SIZE} color={colors.text} />
              ) : (
                <AppText variant="title" numeric>
                  {key}
                </AppText>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
