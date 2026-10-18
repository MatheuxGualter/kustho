import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Inbox, Search } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLookups } from '@/features/shared/useLookups';
import { errorMessage } from '@/features/shared/errorMessage';
import type { Transaction, TransactionKind, TxFilters } from '@/domain/types';
import { currentMonth, formatDayMonth } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { EmptyState } from '@/ui/components/EmptyState';
import { MonthSwitcher } from '@/ui/components/MonthSwitcher';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';
import { TransactionRow } from '@/ui/components/TransactionRow';
import { spacing } from '@/ui/tokens';

import { DueScheduledBanner } from './DueScheduledBanner';

type KindFilter = 'all' | 'expense' | 'income' | 'transfer';

const kindFilters: Record<KindFilter, TransactionKind[] | undefined> = {
  all: undefined,
  expense: ['expense', 'card_purchase'],
  income: ['income'],
  transfer: ['transfer'],
};

const filterOptions = (Object.keys(kindFilters) as KindFilter[]).map((value) => ({
  value,
  label: strings.transactions.filters[value],
}));

type Item = { type: 'day'; date: string; netCents: number } | { type: 'tx'; tx: Transaction };

/** Aba Lançamentos: mês agrupado por dia, com busca, filtro por tipo e excluir/desfazer. */
export function TransactionsScreen() {
  const { transactions } = useServices();
  const lookups = useLookups();
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');

  const filters: TxFilters = { search: search || undefined, kinds: kindFilters[kind] };
  const query = useServiceQuery(
    () => transactions.listMonthTransactions(month, filters),
    [month, search, kind],
  );

  const items: Item[] =
    query.data?.flatMap((day): Item[] => [
      { type: 'day', date: day.date, netCents: day.netCents },
      ...day.transactions.map((tx): Item => ({ type: 'tx', tx })),
    ]) ?? [];

  const remove = (tx: Transaction) =>
    transactions
      .deleteTransaction(tx.id)
      .then((ids) =>
        showToast(strings.transactions.deleted(ids.length), () => {
          void transactions.restoreTransactions(ids);
        }),
      )
      .catch((e: unknown) => showToast(errorMessage(e)));

  const filtered = search !== '' || kind !== 'all';

  const header = (
    <View className="gap-3 px-4 pb-2 pt-4">
      <AppText variant="headline" accessibilityRole="header">
        {strings.screens.transactions.title}
      </AppText>
      <MonthSwitcher value={month} onChange={setMonth} />
      <DueScheduledBanner />
      <TextField
        label={strings.transactions.searchPlaceholder}
        hideLabel
        placeholder={strings.transactions.searchPlaceholder}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <SegmentedControl options={filterOptions} value={kind} onChange={setKind} />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <FlashList
        data={items}
        ListHeaderComponent={header}
        keyExtractor={(item) => (item.type === 'day' ? `day-${item.date}` : item.tx.id)}
        getItemType={(item) => item.type}
        renderItem={({ item }) =>
          item.type === 'day' ? (
            <View className="flex-row items-center justify-between px-4 pb-1 pt-4">
              <AppText variant="label" tone="muted">
                {formatDayMonth(item.date)}
              </AppText>
              {item.netCents !== 0 ? (
                <AppText
                  variant="caption"
                  tone="muted"
                  numeric
                  accessibilityLabel={strings.transactions.dayNet(formatBRL(item.netCents))}
                >
                  {formatBRL(item.netCents, { sign: 'always' })}
                </AppText>
              ) : null}
            </View>
          ) : (
            <TransactionRow
              transaction={item.tx}
              originName={lookups?.originName(item.tx) ?? ''}
              category={item.tx.categoryId ? lookups?.categoryById.get(item.tx.categoryId) : null}
              onPress={() => router.push(`/lancamento/${item.tx.id}`)}
              onEdit={() => router.push(`/lancamento/${item.tx.id}`)}
              onDelete={() => void remove(item.tx)}
            />
          )
        }
        ListEmptyComponent={
          query.status === 'loading' ? (
            <View className="px-4">
              <SkeletonRows count={6} />
            </View>
          ) : (
            <EmptyState
              icon={filtered ? Search : Inbox}
              title={filtered ? strings.transactions.emptySearch : strings.transactions.empty}
              description={filtered ? undefined : strings.transactions.emptyText}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: spacing[8] }}
      />
    </SafeAreaView>
  );
}
