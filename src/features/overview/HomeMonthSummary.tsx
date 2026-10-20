import * as Haptics from 'expo-haptics';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMonthTitle, monthOf, today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { MoneyText } from '@/ui/components/MoneyText';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';

import { Donut } from './Donut';
import { donutSlices, type Slice } from './donut';
import { type Period, periodRange, periods } from './period';
import { CircleDollarSign, ReceiptText } from 'lucide-react-native';

const periodOptions = periods.map((value) => ({ value, label: strings.overview.periods[value] }));

function periodTitle(period: Period, day: string): string {
  if (period === 'month') return formatMonthTitle(monthOf(day));
  if (period === 'year') return day.slice(0, 4);
  return strings.overview.periodTitles[period];
}

/**
 * Seção da Início (trilha D): entradas, saídas e resultado do período (dia, semana, mês ou
 * ano) e rosca de gastos por categoria. Tocar numa fatia ou na legenda mostra o valor.
 */
export function HomeMonthSummary() {
  const { transactions, categories } = useServices();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('month');
  const [selected, setSelected] = useState<string | null>(null);
  const day = today();
  const { from, to } = periodRange(period, day);

  const query = useServiceQuery(async () => {
    const [summary, list] = await Promise.all([
      transactions.getPeriodSummary(from, to),
      categories.listCategories('expense'),
    ]);
    return { summary, categoryById: new Map(list.map((c) => [c.id, c])) };
  }, [from, to]);

  const select = (key: string | null) => {
    void Haptics.selectionAsync();
    setSelected(key);
  };

  const data = query.data;
  const slices = data ? donutSlices(data.summary.expensesByCategory) : [];
  const colorOf = (s: Slice) =>
    (s.categoryId && data?.categoryById.get(s.categoryId)?.color) || colors['text-muted'];
  const nameOf = (s: Slice) =>
    s.others
      ? strings.overview.others
      : (s.categoryId && data?.categoryById.get(s.categoryId)?.name) || strings.categories.none;
  const current = slices.find((s) => s.key === selected) ?? null;

  return (
    <Card>
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
        <View className="flex-row items-center gap-2">
          <ReceiptText size={20} color={colors['text']} />
          <AppText variant="title">{strings.overview.summary}</AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {periodTitle(period, day)}
        </AppText>
      </View>
      <SegmentedControl
        layout="wrap"
        options={periodOptions}
        value={period}
        onChange={(next) => {
          setPeriod(next);
          setSelected(null);
        }}
      />
      {!data ? (
        <SkeletonRows count={2} />
      ) : (
        <>
          <View className="my-6 flex-row flex-wrap gap-x-4 gap-y-2">
            <Figure label={strings.overview.income}>
              <MoneyText cents={data.summary.incomeCents} tone="income" variant="title" />
            </Figure>
            <Figure label={strings.overview.expense}>
              <MoneyText cents={-data.summary.expenseCents} tone="expense" variant="title" />
            </Figure>
            <Figure label={strings.overview.net}>
              <MoneyText
                cents={data.summary.netCents}
                tone={data.summary.netCents >= 0 ? 'income' : 'expense'}
                variant="title"
              />
            </Figure>
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          {data.summary.projectedNetCents !== data.summary.netCents ? (
            <View className="flex-row flex-wrap items-baseline gap-x-1">
              <AppText variant="caption" tone="muted">
                {strings.overview.projected}
              </AppText>
              <MoneyText cents={data.summary.projectedNetCents} variant="caption" />
            </View>
          ) : null}

          <View className="mb-3 flex-row items-center gap-2">
            <CircleDollarSign size={17} color={colors['text-muted']} />
            <AppText variant="label" tone="muted">
              {strings.overview.byCategory}
            </AppText>
          </View>
          {slices.length === 0 ? (
            <AppText tone="muted">{strings.overview.noExpensesPeriod}</AppText>
          ) : (
            <>
              <View className="items-center">
                <Donut slices={slices} colorOf={colorOf} selected={selected} onSelect={select}>
                  <AppText variant="caption" tone="muted" className="text-center" numberOfLines={2}>
                    {current ? nameOf(current) : strings.overview.totalSpent}
                  </AppText>
                  <MoneyText
                    cents={current ? current.cents : data.summary.expenseCents}
                    variant="title"
                    className="text-base"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  />
                  {current ? (
                    <AppText variant="caption" tone="muted" numeric>
                      {strings.overview.share(Math.round(current.share * 100))}
                    </AppText>
                  ) : null}
                </Donut>
              </View>
              <AppText variant="caption" tone="muted" className="text-center">
                {strings.overview.tapHint}
              </AppText>
              <View className="gap-1">
                {slices.map((s) => {
                  const active = selected === s.key;
                  return (
                    <Pressable
                      key={s.key}
                      accessibilityRole="button"
                      accessibilityLabel={strings.overview.selectCategory(nameOf(s))}
                      accessibilityState={{ selected: active }}
                      onPress={() => select(active ? null : s.key)}
                      className={`min-h-touch flex-row items-center gap-2 rounded-input px-2 ${active ? 'bg-surface-raised' : ''} ${selected && !active ? 'opacity-50' : ''}`}
                    >
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: colorOf(s) }}
                      />
                      <AppText className="flex-1" numberOfLines={1}>
                        {nameOf(s)}
                      </AppText>
                      <MoneyText cents={s.cents} variant="label" />
                      <AppText
                        variant="caption"
                        tone="muted"
                        numeric
                        className="w-[14%] text-right"
                      >
                        {strings.overview.share(Math.round(s.share * 100))}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-w-[28%] grow gap-1">
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}
