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
import { ChipSelect } from '@/ui/components/ChipSelect';
import { DateField } from '@/ui/components/DateField';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';

/** Pagar fatura (regra 6): total ou parcial, debitando a conta escolhida. */
export function PayInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, accounts } = useServices();
  const query = useServiceQuery(async () => {
    const invoice = await cards.getInvoice(id);
    const [card, accountList] = await Promise.all([
      invoice ? cards.getCard(invoice.cardId) : undefined,
      accounts.listAccountsWithBalance(),
    ]);
    return { invoice, card, accountList };
  }, [id]);

  if (!query.data?.invoice) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonRows />
      </Screen>
    );
  }
  const { invoice, card, accountList } = query.data;
  return (
    <PayForm
      key={invoice.id}
      invoiceId={invoice.id}
      remainingCents={invoice.remainingCents}
      defaultAccountId={card?.paymentAccountId ?? accountList[0]?.id ?? null}
      accountOptions={accountList.map((a) => ({
        value: a.id,
        label: `${a.name} · ${formatBRL(a.balanceCents)}`,
        color: a.color,
      }))}
      pay={(accountId, amount, date) => cards.payInvoice(invoice.id, accountId, amount, date)}
    />
  );
}

function PayForm({
  remainingCents,
  defaultAccountId,
  accountOptions,
  pay,
}: {
  invoiceId: string;
  remainingCents: number;
  defaultAccountId: string | null;
  accountOptions: { value: string; label: string; color: string }[];
  pay: (accountId: string, amount: number, date: string) => Promise<unknown>;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [amount, setAmount] = useState<number | null>(remainingCents);
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const valid = accountId !== null && amount !== null && amount > 0;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await pay(accountId, amount, date);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(strings.cards.pay.done);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.payInvoice.title }} />
      <Screen edges={['bottom']}>
        {remainingCents === 0 ? (
          <AppText tone="muted">{strings.cards.pay.nothingDue}</AppText>
        ) : (
          <>
            <ChipSelect
              label={strings.cards.pay.account}
              options={accountOptions}
              value={accountId}
              onChange={setAccountId}
            />
            <MoneyField
              label={strings.cards.pay.amount}
              hint={strings.cards.pay.amountHint(formatBRL(remainingCents))}
              value={amount}
              onChange={setAmount}
            />
            <DateField value={date} onChange={setDate} />
            <Button
              label={strings.cards.pay.confirm}
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
