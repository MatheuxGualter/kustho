import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/features/shared/errorMessage';
import { today } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { DateField } from '@/ui/components/DateField';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';

/**
 * Estorno de uma compra no cartão, total ou parcial (`/fatura/[id]/estorno?compra=`). O
 * estorno cai na fatura da compra ou, se ela já fechou, na aberta (regra no serviço).
 */
export function RefundScreen() {
  const { compra } = useLocalSearchParams<{ compra: string }>();
  const { transactions, cards } = useServices();
  const query = useServiceQuery(async () => {
    const purchase = await transactions.getTransaction(compra);
    const refundable = purchase ? await cards.getRefundableCents(purchase.id) : 0;
    return { purchase, refundable };
  }, [compra]);
  const purchase = query.data?.purchase;

  if (!purchase || !query.data) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonRows />
      </Screen>
    );
  }
  return (
    <RefundForm
      key={purchase.id}
      purchaseId={purchase.id}
      description={purchase.description}
      purchaseCents={purchase.amountCents}
      refundableCents={query.data.refundable}
    />
  );
}

function RefundForm({
  purchaseId,
  description,
  purchaseCents,
  refundableCents,
}: {
  purchaseId: string;
  description: string;
  purchaseCents: number;
  /** Compra menos os estornos já feitos. */
  refundableCents: number;
}) {
  const { cards } = useServices();
  const [amount, setAmount] = useState<number | null>(refundableCents);
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const valid = amount !== null && amount > 0 && amount <= refundableCents;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await cards.refundCardPurchase(purchaseId, amount, date);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(strings.cards.invoice.refunded);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.cards.refund.title }} />
      <Screen edges={['bottom']}>
        <AppText tone="muted">{strings.cards.refund.intro(description)}</AppText>
        {refundableCents === 0 ? (
          <AppText>{strings.cards.refund.nothingLeft}</AppText>
        ) : (
          <>
            <MoneyField
              label={strings.cards.refund.amount}
              hint={
                amount !== null && amount > refundableCents
                  ? strings.cards.refund.tooHigh(formatBRL(refundableCents))
                  : strings.cards.refund.amountHint(
                      formatBRL(purchaseCents),
                      formatBRL(refundableCents),
                    )
              }
              value={amount}
              onChange={setAmount}
            />
            <DateField value={date} onChange={setDate} />
            <Button
              label={strings.cards.refund.confirm}
              block
              disabled={!valid}
              loading={busy}
              onPress={() => void submit()}
            />
          </>
        )}
      </Screen>
    </>
  );
}
