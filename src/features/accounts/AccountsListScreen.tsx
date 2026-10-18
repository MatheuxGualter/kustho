import { router, Stack } from 'expo-router';
import { Plus, Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';

import { AccountCard } from './AccountCard';

/** Todas as contas: ativas primeiro, arquivadas no fim. */
export function AccountsListScreen() {
  const { accounts } = useServices();
  const query = useServiceQuery(
    () => accounts.listAccountsWithBalance({ includeArchived: true }),
    [],
  );
  const active = query.data?.filter((a) => a.archivedAt === null) ?? [];
  const archived = query.data?.filter((a) => a.archivedAt !== null) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.accounts.title }} />
      <Screen edges={['bottom']}>
        <Button
          label={strings.accounts.newAccount}
          icon={Plus}
          block
          onPress={() => router.push('/conta/nova')}
        />
        {query.status === 'loading' ? (
          <SkeletonRows />
        ) : active.length === 0 && archived.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={strings.accounts.empty}
            description={strings.accounts.emptyText}
          />
        ) : (
          <View className="gap-2">
            <AppText variant="caption" tone="muted">
              {strings.accounts.accountsCount(active.length)}
            </AppText>
            {active.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
            {archived.length > 0 ? (
              <>
                <AppText variant="label" tone="muted" className="mt-4">
                  {strings.accounts.archived}
                </AppText>
                {archived.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </>
            ) : null}
          </View>
        )}
      </Screen>
    </>
  );
}
