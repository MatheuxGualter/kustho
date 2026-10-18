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
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';

/** Transferência entre contas (regra 7). Aceita `?from=<id>` para preencher a origem. */
export function TransferScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const { accounts } = useServices();
  const query = useServiceQuery(() => accounts.listAccountsWithBalance(), []);
  const [from, setFrom] = useState<string | null>(params.from ?? null);
  const [to, setTo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const options =
    query.data?.map((a) => ({
      value: a.id,
      label: `${a.name} · ${formatBRL(a.balanceCents)}`,
      color: a.color,
    })) ?? [];
  const valid = from !== null && to !== null && from !== to && amount !== null && amount > 0;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await accounts.createTransfer({
        fromAccountId: from,
        toAccountId: to,
        amountCents: amount,
        date,
        description: description.trim() || undefined,
      });
      showToast(strings.accounts.transfer.done);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.transfer.title }} />
      <Screen edges={['bottom']}>
        {query.status === 'loading' ? (
          <SkeletonRows />
        ) : options.length < 2 ? (
          <AppText tone="muted">{strings.accounts.transfer.needTwo}</AppText>
        ) : (
          <>
            <ChipSelect
              label={strings.accounts.transfer.from}
              options={options}
              value={from}
              onChange={setFrom}
            />
            <ChipSelect
              label={strings.accounts.transfer.to}
              options={options.map((o) => ({ ...o, disabled: o.value === from }))}
              value={to}
              onChange={setTo}
            />
            <MoneyField label={strings.fields.amount} value={amount} onChange={setAmount} />
            <DateField value={date} onChange={setDate} />
            <TextField
              label={strings.fields.description}
              placeholder={strings.accounts.transfer.descriptionPlaceholder}
              value={description}
              onChangeText={setDescription}
            />
            <Button
              label={strings.accounts.transfer.confirm}
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
