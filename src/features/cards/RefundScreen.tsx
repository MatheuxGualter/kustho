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
  const { transactions } = useServices();
  const query = useServiceQuery(() => transactions.getTransaction(compra), [compra]);
  const purchase = query.data;

  if (!purchase) {
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
    />
  );
}

function RefundForm({
  purchaseId,
  description,
  purchaseCents,
}: {
  purchaseId: string;
  description: string;
  purchaseCents: number;
}) {
  const { cards } = useServices();
  const [amount, setAmount] = useState<number | null>(purchaseCents);
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const valid = amount !== null && amount > 0 && amount <= purchaseCents;

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
        <MoneyField
          label={strings.cards.refund.amount}
          hint={
            amount !== null && amount > purchaseCents
              ? strings.cards.refund.tooHigh(formatBRL(purchaseCents))
              : strings.cards.refund.amountHint(formatBRL(purchaseCents))
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
      </Screen>
    </>
  );
}
