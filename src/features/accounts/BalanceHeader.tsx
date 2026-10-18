import { Eye, EyeOff } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { formatBRL } from '@/lib/money';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { MoneyText } from '@/ui/components/MoneyText';
import { Skeleton } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';

const ICON_SIZE = 22;

/** Saldo total grande, olho para ocultar valores e variação desde o início do mês. */
export function BalanceHeader({
  totalCents,
  monthChangeCents,
}: {
  totalCents: number | undefined;
  monthChangeCents: number | undefined;
}) {
  const { colors } = useTheme();
  const hideValues = usePreferences((s) => s.hideValues);
  const toggle = usePreferences((s) => s.toggleHideValues);
  const Icon = hideValues ? EyeOff : Eye;

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <AppText variant="label" tone="muted">
          {strings.accounts.totalBalance}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hideValues ? strings.money.showValues : strings.money.hideValues}
          onPress={toggle}
          className="min-h-touch min-w-touch items-center justify-center"
        >
          <Icon size={ICON_SIZE} color={colors['text-muted']} />
        </Pressable>
      </View>
      {totalCents === undefined ? (
        <Skeleton className="h-fab w-[60%]" />
      ) : (
        <MoneyText
          cents={totalCents}
          variant="display"
          tone={totalCents < 0 ? 'expense' : 'neutral'}
          adjustsFontSizeToFit
          numberOfLines={1}
        />
      )}
      {monthChangeCents !== undefined && monthChangeCents !== 0 && !hideValues ? (
        <AppText
          variant="caption"
          numeric
          tone={monthChangeCents > 0 ? 'income' : 'expense'}
          accessibilityLabel={strings.accounts.monthChange(formatBRL(monthChangeCents))}
        >
          {strings.accounts.monthChange(formatBRL(monthChangeCents, { sign: 'always' }))}
        </AppText>
      ) : null}
    </View>
  );
}
