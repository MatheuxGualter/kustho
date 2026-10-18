import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import { Alert, View } from 'react-native';

import { useLookups } from '@/features/shared/useLookups';
import { errorMessage } from '@/features/shared/errorMessage';
import type { Transaction } from '@/domain/types';
import { formatDateBR, formatMonthLong, today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { MoneyText } from '@/ui/components/MoneyText';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';
import { TransactionRow } from '@/ui/components/TransactionRow';

/** Fatura: totais, datas, situação, compras, estornos e pagamentos. */
export function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards } = useServices();
  const lookups = useLookups();
  const query = useServiceQuery(async () => {
    const [invoice, rows] = await Promise.all([
      cards.getInvoice(id),
      cards.listInvoiceTransactions(id),
    ]);
    return { invoice, rows };
  }, [id]);
  const invoice = query.data?.invoice;

  const purchaseActions = (tx: Transaction) =>
    Alert.alert(tx.description, strings.cards.invoice.purchaseActions, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.cards.invoice.editPurchase,
        onPress: () => router.push(`/lancamento/${tx.id}`),
      },
      {
        text: strings.cards.invoice.refundPurchase,
        onPress: () =>
          void cards
            .refundCardPurchase(tx.id, tx.amountCents, today())
            .then(() => showToast(strings.cards.invoice.refunded))
            .catch((e: unknown) => showToast(errorMessage(e))),
      },
    ]);

  const title = invoice ? formatMonthLong(invoice.referenceMonth) : strings.screens.invoice.title;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen edges={['bottom']}>
        {!invoice ? (
          <SkeletonRows />
        ) : (
          <>
            <Card>
              <AppText variant="caption" tone="muted">
                {`${strings.cards.status[invoice.status]} · ${strings.cards.closesOn(formatDateBR(invoice.closingDate))} · ${strings.cards.dueOn(formatDateBR(invoice.dueDate))}`}
              </AppText>
              <View className="gap-1">
                <AppText variant="caption" tone="muted">
                  {strings.cards.invoice.remaining}
                </AppText>
                <MoneyText cents={-invoice.remainingCents} variant="headline" />
              </View>
              <View className="flex-row justify-between">
                <AppText variant="caption" tone="muted">
                  {strings.cards.invoice.total}{' '}
                  <MoneyText cents={invoice.totalCents} variant="caption" />
                </AppText>
                <AppText variant="caption" tone="muted">
                  {strings.cards.invoice.paid}{' '}
                  <MoneyText cents={invoice.paidCents} variant="caption" />
                </AppText>
              </View>
              {invoice.remainingCents > 0 ? (
                <Button
                  label={strings.cards.invoice.pay}
                  icon={Wallet}
                  block
                  onPress={() => router.push(`/fatura/${id}/pagar`)}
                />
              ) : null}
            </Card>
            <AppText variant="title">{strings.cards.invoice.purchases}</AppText>
            {query.data!.rows.length === 0 ? (
              <AppText tone="muted">{strings.cards.invoice.empty}</AppText>
            ) : (
              <View className="overflow-hidden rounded-card border border-border">
                {query.data!.rows.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    originName={
                      tx.kind === 'invoice_payment'
                        ? (lookups?.originName({ accountId: tx.accountId, cardId: null }) ?? '')
                        : formatDateBR(tx.date)
                    }
                    category={tx.categoryId ? lookups?.categoryById.get(tx.categoryId) : null}
                    onPress={() =>
                      tx.kind === 'card_purchase'
                        ? purchaseActions(tx)
                        : router.push(`/lancamento/${tx.id}`)
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </Screen>
    </>
  );
}
