import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react-native';
import { Alert, View } from 'react-native';

import { errorMessage } from '@/features/shared/errorMessage';
import { cycleForPurchase } from '@/domain/invoices/cycle';
import type { InvoiceWithTotals } from '@/domain/contracts';
import { today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';

import { CreditCardVisual } from './CreditCardVisual';
import { InvoiceRow } from './InvoiceRow';

/** Detalhe do cartão: limite, fatura atual, próximas (parcelas) e anteriores. */
export function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards } = useServices();
  const query = useServiceQuery(async () => {
    const [summaries, invoices] = await Promise.all([
      cards.listCardsWithSummary({ includeArchived: true }),
      cards.listInvoices(id),
    ]);
    return { card: summaries.find((c) => c.id === id), invoices };
  }, [id]);

  const card = query.data?.card;
  const current = card ? cycleForPurchase(card, today()).referenceMonth : null;
  const sections: [string, InvoiceWithTotals[]][] = current
    ? [
        [
          strings.cards.sections.current,
          query.data!.invoices.filter((i) => i.referenceMonth === current),
        ],
        [
          strings.cards.sections.upcoming,
          query.data!.invoices.filter((i) => i.referenceMonth > current).reverse(),
        ],
        [
          strings.cards.sections.past,
          query.data!.invoices.filter((i) => i.referenceMonth < current),
        ],
      ]
    : [];

  const confirmDelete = () =>
    Alert.alert(strings.cards.detail.delete, strings.cards.detail.deleteConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.cards.detail.delete,
        style: 'destructive',
        onPress: () =>
          void cards
            .deleteCard(id)
            .then(() => {
              router.back();
              showToast(strings.cards.detail.deleted, () => void cards.restoreCard(id));
            })
            .catch((e: unknown) => Alert.alert(strings.cards.detail.delete, errorMessage(e))),
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: card?.name ?? strings.screens.card.title }} />
      <Screen edges={['bottom']}>
        {!card ? (
          <SkeletonRows />
        ) : (
          <>
            <CreditCardVisual card={card} />
            <Button
              label={strings.cards.detail.edit}
              icon={Pencil}
              variant="secondary"
              onPress={() => router.push({ pathname: '/cartao/novo', params: { id } })}
            />
            {query.data!.invoices.length === 0 ? (
              <AppText tone="muted">{strings.cards.detail.noInvoices}</AppText>
            ) : (
              sections
                .filter(([, list]) => list.length > 0)
                .map(([title, list]) => (
                  <View key={title} className="gap-2">
                    <AppText variant="title">{title}</AppText>
                    <View className="overflow-hidden rounded-card border border-border">
                      {list.map((invoice, i) => (
                        <View key={invoice.id} className={i > 0 ? 'border-t border-border' : ''}>
                          <InvoiceRow invoice={invoice} />
                        </View>
                      ))}
                    </View>
                  </View>
                ))
            )}
            <View className="gap-2 pt-4">
              <Button
                label={
                  card.archivedAt ? strings.cards.detail.unarchive : strings.cards.detail.archive
                }
                icon={card.archivedAt ? ArchiveRestore : Archive}
                variant="secondary"
                block
                onPress={() =>
                  void cards
                    .setCardArchived(id, !card.archivedAt)
                    .catch((e: unknown) => showToast(errorMessage(e)))
                }
              />
              <Button
                label={strings.cards.detail.delete}
                icon={Trash2}
                variant="danger"
                block
                onPress={confirmDelete}
              />
            </View>
          </>
        )}
      </Screen>
    </>
  );
}
