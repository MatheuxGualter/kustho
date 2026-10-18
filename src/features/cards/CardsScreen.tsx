import { router } from 'expo-router';
import { CreditCard, Plus } from 'lucide-react-native';

import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
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
