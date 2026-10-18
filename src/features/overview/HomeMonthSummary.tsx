import { View } from 'react-native';

import { currentMonth, formatMonthLong } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { MoneyText } from '@/ui/components/MoneyText';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';

import { Donut } from './Donut';
import { donutSlices } from './donut';

/** Seção da Início (trilha D): entradas, saídas, resultado, previsto e rosca por categoria. */
export function HomeMonthSummary() {
  const { transactions, categories } = useServices();
  const { colors } = useTheme();
  const month = currentMonth();
  const query = useServiceQuery(async () => {
    const [summary, list] = await Promise.all([
      transactions.getMonthSummary(month),
      categories.listCategories('expense'),
    ]);
    return { summary, categoryById: new Map(list.map((c) => [c.id, c])) };
  }, [month]);

  if (!query.data) return <SkeletonRows count={2} />;
  const { summary, categoryById } = query.data;
  const slices = donutSlices(summary.expensesByCategory);
  const colorOf = (s: (typeof slices)[number]) =>
    (s.categoryId && categoryById.get(s.categoryId)?.color) || colors['text-muted'];
  const nameOf = (s: (typeof slices)[number]) =>
    s.others
      ? strings.overview.others
      : (s.categoryId && categoryById.get(s.categoryId)?.name) || strings.categories.none;

  return (
    <Card>
      <View className="flex-row items-baseline justify-between">
        <AppText variant="title">{strings.overview.monthSummary}</AppText>
        <AppText variant="caption" tone="muted">
          {formatMonthLong(month)}
        </AppText>
      </View>
      <View className="flex-row flex-wrap gap-4">
        <View className="grow gap-1">
          <AppText variant="caption" tone="muted">
            {strings.overview.income}
          </AppText>
          <MoneyText cents={summary.incomeCents} tone="income" variant="label" />
        </View>
        <View className="grow gap-1">
          <AppText variant="caption" tone="muted">
            {strings.overview.expense}
          </AppText>
          <MoneyText cents={-summary.expenseCents} tone="expense" variant="label" />
        </View>
        <View className="grow gap-1">
          <AppText variant="caption" tone="muted">
            {strings.overview.net}
          </AppText>
          <MoneyText
            cents={summary.netCents}
            tone={summary.netCents >= 0 ? 'income' : 'expense'}
            variant="label"
          />
        </View>
      </View>
      {summary.projectedNetCents !== summary.netCents ? (
        <AppText variant="caption" tone="muted">
          {strings.overview.projected}{' '}
          <MoneyText cents={summary.projectedNetCents} variant="caption" />
        </AppText>
      ) : null}

      <AppText variant="label" tone="muted">
        {strings.overview.byCategory}
      </AppText>
      {slices.length === 0 ? (
        <AppText tone="muted">{strings.overview.noExpenses}</AppText>
      ) : (
        <View className="flex-row flex-wrap items-center gap-4">
          <Donut slices={slices} colorOf={colorOf} />
          <View className="min-w-[45%] flex-1 gap-2">
            {slices.map((s) => (
              <View key={s.key} className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: colorOf(s) }} />
                <AppText variant="caption" className="flex-1" numberOfLines={1}>
                  {nameOf(s)}
                </AppText>
                <AppText variant="caption" tone="muted" numeric>
                  {strings.overview.share(Math.round(s.share * 100))}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
