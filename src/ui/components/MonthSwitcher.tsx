import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { addMonths, currentMonth, formatMonthTitle, type YearMonth } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useTheme } from '@/ui/theme';

import { AppText } from './AppText';

const ICON_SIZE = 24;
/** Distância mínima (dp) de um deslize horizontal para trocar de mês. */
const SWIPE_DISTANCE = 40;

/** Troca de mês por toque nas setas, deslize lateral ou toque no nome (volta ao atual). */
export function MonthSwitcher({
  value,
  onChange,
}: {
  value: YearMonth;
  onChange: (month: YearMonth) => void;
}) {
  const { colors } = useTheme();
  const go = (delta: number) => {
    void Haptics.selectionAsync();
    onChange(addMonths(value, delta));
  };
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-SWIPE_DISTANCE, SWIPE_DISTANCE])
    .onEnd((e) => go(e.translationX < 0 ? 1 : -1));
  const isCurrent = value === currentMonth();

  return (
    <GestureDetector gesture={swipe}>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.month.previous}
          onPress={() => go(-1)}
          className="min-h-touch min-w-touch items-center justify-center"
        >
          <ChevronLeft size={ICON_SIZE} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={isCurrent ? undefined : strings.month.current}
          disabled={isCurrent}
          onPress={() => onChange(currentMonth())}
          className="min-h-touch flex-1 items-center justify-center"
        >
          <AppText variant="title">{formatMonthTitle(value)}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.month.next}
          onPress={() => go(1)}
          className="min-h-touch min-w-touch items-center justify-center"
        >
          <ChevronRight size={ICON_SIZE} color={colors.text} />
        </Pressable>
      </View>
    </GestureDetector>
  );
}
