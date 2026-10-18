import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeftRight,
  Archive,
  ArchiveRestore,
  Pencil,
  Scale,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { errorMessage } from '@/features/shared/errorMessage';
import { currentMonth, formatDayMonth, today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { InstitutionAvatar } from '@/ui/components/InstitutionAvatar';
import { MoneyField } from '@/ui/components/MoneyField';
import { MoneyText } from '@/ui/components/MoneyText';
import { Screen } from '@/ui/components/Screen';
import { Skeleton, SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';
import { TransactionRow } from '@/ui/components/TransactionRow';

/** Detalhe da conta: saldo, ações e lançamentos do mês. */
export function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts, transactions, categories } = useServices();
  const [adjusting, setAdjusting] = useState(false);

  const query = useServiceQuery(async () => {
    const account = await accounts.getAccount(id);
    if (!account) return null;
    const [balanceCents, days, categoryList] = await Promise.all([
      accounts.getAccountBalance(id, today()),
      transactions.listMonthTransactions(currentMonth(), { accountIds: [id] }),
      categories.listCategories(),
    ]);
    return {
      account,
      balanceCents,
      days,
      categoryById: new Map(categoryList.map((c) => [c.id, c])),
    };
  }, [id]);

  const data = query.data;
  const run = (action: () => Promise<unknown>, done?: string) =>
    action()
      .then(() => done && showToast(done))
      .catch((e: unknown) => showToast(errorMessage(e)));

  const confirmDelete = () =>
    Alert.alert(strings.accounts.detail.delete, strings.accounts.detail.deleteConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.accounts.detail.delete,
        style: 'destructive',
        onPress: () =>
          void accounts
            .deleteAccount(id)
            .then(() => {
              router.back();
              showToast(strings.accounts.detail.deleted, () => void accounts.restoreAccount(id));
            })
            .catch((e: unknown) => Alert.alert(strings.accounts.detail.delete, errorMessage(e))),
      },
    ]);

  if (query.status === 'success' && !data) {
    return <Stack.Screen options={{ title: strings.screens.account.title }} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: data?.account.name ?? strings.screens.account.title }} />
      <Screen edges={['bottom']}>
        {!data ? (
          <Skeleton className="h-fab" />
        ) : (
          <Card>
            <View className="flex-row items-center gap-3">
              <InstitutionAvatar color={data.account.color} initials={data.account.icon} />
              <View className="flex-1">
                <AppText variant="caption" tone="muted">
                  {strings.accounts.detail.balance}
                </AppText>
                <MoneyText
                  cents={data.balanceCents}
                  variant="headline"
                  tone={data.balanceCents < 0 ? 'expense' : 'neutral'}
                />
              </View>
            </View>
          </Card>
        )}

        {data ? (
          <View className="flex-row flex-wrap gap-2">
            <Button
              label={strings.accounts.detail.adjust}
              icon={Scale}
              variant="secondary"
              onPress={() => setAdjusting((v) => !v)}
            />
            <Button
              label={strings.accounts.detail.transfer}
              icon={ArrowLeftRight}
              variant="secondary"
              onPress={() => router.push({ pathname: '/transferencia', params: { from: id } })}
            />
            <Button
              label={strings.accounts.detail.edit}
              icon={Pencil}
              variant="secondary"
              onPress={() => router.push({ pathname: '/conta/nova', params: { id } })}
            />
          </View>
        ) : null}

        {adjusting && data ? (
          <AdjustBalanceCard
            currentCents={data.balanceCents}
            onConfirm={async (target) => {
              const result = await accounts.adjustBalance(id, target, today());
              setAdjusting(false);
              showToast(result ? strings.accounts.adjust.done : strings.accounts.adjust.unchanged);
            }}
          />
        ) : null}

        <AppText variant="title">{strings.accounts.detail.thisMonth}</AppText>
        {!data ? (
          <SkeletonRows />
        ) : data.days.length === 0 ? (
          <AppText tone="muted">{strings.accounts.detail.noTransactions}</AppText>
        ) : (
          <View className="overflow-hidden rounded-card border border-border">
            {data.days.map((day) => (
              <View key={day.date}>
                <AppText variant="caption" tone="muted" className="bg-bg px-4 py-2">
                  {formatDayMonth(day.date)}
                </AppText>
                {day.transactions.map((tx) => {
                  const category = tx.categoryId ? data.categoryById.get(tx.categoryId) : null;
                  return (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      originName={data.account.name}
                      category={category}
                      onPress={() => router.push(`/lancamento/${tx.id}`)}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {data ? (
          <View className="gap-2 pt-4">
            <Button
              label={
                data.account.archivedAt
                  ? strings.accounts.detail.unarchive
                  : strings.accounts.detail.archive
              }
              icon={data.account.archivedAt ? ArchiveRestore : Archive}
              variant="secondary"
              block
              onPress={() => run(() => accounts.setAccountArchived(id, !data.account.archivedAt))}
            />
            <Button
              label={strings.accounts.detail.delete}
              icon={Trash2}
              variant="danger"
              block
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

function AdjustBalanceCard({
  currentCents,
  onConfirm,
}: {
  currentCents: number;
  onConfirm: (targetCents: number) => Promise<void>;
}) {
  const [target, setTarget] = useState<number | null>(currentCents);
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <AppText variant="title">{strings.accounts.adjust.title}</AppText>
      <AppText tone="muted">{strings.accounts.adjust.hint}</AppText>
      <MoneyField
        label={strings.accounts.adjust.newBalance}
        value={target}
        onChange={setTarget}
        allowNegative
        autoFocus
      />
      <Button
        label={strings.accounts.adjust.confirm}
        block
        loading={busy}
        disabled={target === null}
        onPress={() => {
          if (target === null) return;
          setBusy(true);
          onConfirm(target)
            .catch((e: unknown) => showToast(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
