import { router } from 'expo-router';
import { View } from 'react-native';

import { formatDateBR } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { InstitutionAvatar } from '@/ui/components/InstitutionAvatar';
import { MoneyText } from '@/ui/components/MoneyText';

import { InvoicesTotalCard } from './InvoicesTotalCard';

/** Seção da Início (trilha C): fatura atual de cada cartão, separada do saldo, e o total. */
export function HomeCardsSection() {
  const { cards } = useServices();
  const query = useServiceQuery(() => cards.listCardsWithSummary(), []);
  if (!query.data || query.data.length === 0) return null;

  return (
    <View className="gap-2">
      <AppText variant="title">{strings.screens.cards.title}</AppText>
      {query.data.map((card) => (
        <Card
          key={card.id}
          onPress={() => router.push(`/cartao/${card.id}`)}
          accessibilityLabel={card.name}
        >
          <View className="flex-row items-center gap-3">
            <InstitutionAvatar institution={card.institution} color={card.color} />
            <View className="flex-1 gap-1">
              <AppText variant="label" className="text-base" numberOfLines={1}>
                {card.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                {card.currentInvoice
                  ? strings.cards.dueOn(formatDateBR(card.currentInvoice.dueDate))
                  : strings.cards.noInvoice}
              </AppText>
            </View>
            <MoneyText
              cents={card.currentInvoice?.remainingCents ?? 0}
              variant="label"
              className="text-base"
            />
          </View>
        </Card>
      ))}
      <InvoicesTotalCard cards={query.data} layout="row" />
    </View>
  );
}
