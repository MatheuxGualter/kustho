import { router } from 'expo-router';
import { View } from 'react-native';

import type { AccountWithBalance } from '@/domain/types';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { InstitutionAvatar } from '@/ui/components/InstitutionAvatar';
import { MoneyText } from '@/ui/components/MoneyText';

/** Conta com ícone e cor da instituição e o saldo atual. Toque abre o detalhe. */
export function AccountCard({ account }: { account: AccountWithBalance }) {
  const archived = account.archivedAt !== null;
  return (
    <Card
      onPress={() => router.push(`/conta/${account.id}`)}
      accessibilityLabel={account.name}
      className={archived ? 'opacity-50' : ''}
    >
      <View className="flex-row items-center gap-3">
        <InstitutionAvatar color={account.color} initials={account.icon} />
        <View className="flex-1 gap-1">
          <AppText variant="label" className="text-base" numberOfLines={1}>
            {account.name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {archived ? strings.accounts.archivedBadge : strings.accounts.types[account.type]}
          </AppText>
        </View>
        <MoneyText
          cents={account.balanceCents}
          tone={account.balanceCents < 0 ? 'expense' : 'neutral'}
          variant="label"
          className="text-base"
        />
      </View>
    </Card>
  );
}
