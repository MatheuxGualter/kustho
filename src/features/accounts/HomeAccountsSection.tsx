import { router } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { addMonths, currentMonth, lastDayOfMonth, today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { SkeletonRows } from '@/ui/components/Skeleton';

import { AccountCard } from './AccountCard';
import { BalanceHeader } from './BalanceHeader';

/** Seção da Início (trilha A): saldo total e cards das contas. */
export function HomeAccountsSection() {
  const { accounts } = useServices();
  const query = useServiceQuery(async () => {
    const day = today();
    const list = await accounts.listAccountsWithBalance({ until: day });
    const startOfMonth = await accounts.getTotalBalance(
      lastDayOfMonth(addMonths(currentMonth(), -1)),
    );
    const total = list.reduce((sum, a) => sum + a.balanceCents, 0);
    return { list, total, monthChange: total - startOfMonth };
  }, []);

  const data = query.data;
  return (
    <View className="gap-4">
      <BalanceHeader totalCents={data?.total} monthChangeCents={data?.monthChange} />
      {!data ? (
        <SkeletonRows count={3} />
      ) : data.list.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={strings.accounts.empty}
          description={strings.accounts.emptyText}
          action={{ label: strings.accounts.newAccount, onPress: () => router.push('/conta/nova') }}
        />
      ) : (
        <View className="gap-2">
          {data.list.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
          <Button
            label={strings.accounts.seeAll}
            variant="ghost"
            onPress={() => router.push('/contas')}
          />
        </View>
      )}
    </View>
  );
}
