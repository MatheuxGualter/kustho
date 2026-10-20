import { router } from 'expo-router';
import { CreditCard, Plus } from 'lucide-react-native';

import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { EmptyState } from '@/ui/components/EmptyState';
import { MoneyText } from '@/ui/components/MoneyText';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';

import { CreditCardVisual } from './CreditCardVisual';

/** Aba Cartões: cada cartão com fatura atual, vencimento e limite. */
export function CardsScreen() {
  const { cards } = useServices();
  const query = useServiceQuery(() => cards.listCardsWithSummary(), []);

  return (
    <Screen title={strings.screens.cards.title}>
      {query.status === 'loading' ? (
        <SkeletonRows count={3} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={strings.cards.empty}
          description={strings.cards.emptyText}
          action={{ label: strings.cards.newCard, onPress: () => router.push('/cartao/novo') }}
        />
      ) : (
        <>
          {query.data?.map((card) => (
            <CreditCardVisual
              key={card.id}
              card={card}
              onPress={() => router.push(`/cartao/${card.id}`)}
            />
          ))}
          {(query.data?.length ?? 0) > 1 ? (
            <Card accessibilityLabel={strings.cards.invoicesTotal}>
              <AppText variant="caption" tone="muted">
                {strings.cards.invoicesTotal}
              </AppText>
              <MoneyText
                cents={(query.data ?? []).reduce(
                  (sum, card) => sum + (card.currentInvoice?.remainingCents ?? 0),
                  0,
                )}
                variant="title"
              />
              <AppText variant="caption" tone="muted">
                {strings.cards.invoicesTotalHint(query.data?.length ?? 0)}
              </AppText>
            </Card>
          ) : null}
          <Button
            label={strings.cards.newCard}
            icon={Plus}
            variant="secondary"
            block
            onPress={() => router.push('/cartao/novo')}
          />
        </>
      )}
    </Screen>
  );
}
