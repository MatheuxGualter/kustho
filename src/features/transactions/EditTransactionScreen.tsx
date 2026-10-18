import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';

import { errorMessage } from '@/features/shared/errorMessage';
import type { Transaction, TransactionStatus } from '@/domain/types';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { DateField } from '@/ui/components/DateField';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';

const NO_CATEGORY = 'none';

/** Editar ou excluir um lançamento. */
export function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, categories } = useServices();
  const query = useServiceQuery(async () => {
    const [tx, categoryList] = await Promise.all([
      transactions.getTransaction(id),
      categories.listCategories(),
    ]);
    return { tx, categoryList };
  }, [id]);

  const tx = query.data?.tx;
  if (query.status !== 'success') {
    return (
      <Screen edges={['bottom']}>
        <SkeletonRows />
      </Screen>
    );
  }
  if (!tx) {
    return (
      <Screen edges={['bottom']}>
        <AppText tone="muted">{strings.errors.domain.not_found}</AppText>
      </Screen>
    );
  }
  return <EditForm key={tx.id} tx={tx} categoryList={query.data.categoryList} />;
}

function EditForm({
  tx,
  categoryList,
}: {
  tx: Transaction;
  categoryList: { id: string; name: string; kind: string; color: string }[];
}) {
  const { transactions } = useServices();
  const [amount, setAmount] = useState<number | null>(tx.amountCents);
  const [description, setDescription] = useState(tx.description);
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? NO_CATEGORY);
  const [date, setDate] = useState(tx.date);
  const [status, setStatus] = useState<TransactionStatus>(tx.status);
  const [notes, setNotes] = useState(tx.notes ?? '');
  const [busy, setBusy] = useState(false);

  const categoryKind = tx.kind === 'income' ? 'income' : 'expense';
  const hasCategory = tx.kind === 'income' || tx.kind === 'expense' || tx.kind === 'card_purchase';
  const note =
    tx.kind === 'transfer'
      ? strings.transactions.edit.transferNote
      : tx.installmentGroupId
        ? strings.transactions.edit.installmentNote
        : tx.kind === 'card_purchase'
          ? strings.transactions.edit.cardNote
          : null;
  const valid = amount !== null && amount > 0 && description.trim() !== '';

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await transactions.updateTransaction(tx.id, {
        amountCents: amount,
        description: description.trim(),
        date,
        notes: notes.trim() || null,
        ...(hasCategory ? { categoryId: categoryId === NO_CATEGORY ? null : categoryId } : {}),
        ...(tx.kind === 'income' || tx.kind === 'expense' ? { status } : {}),
      });
      showToast(strings.transactions.saved);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      const ids = await transactions.deleteTransaction(tx.id);
      router.back();
      showToast(strings.transactions.deleted(ids.length), () => {
        void transactions.restoreTransactions(ids);
      });
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.editTransaction.title }} />
      <Screen edges={['bottom']}>
        {note ? (
          <AppText variant="caption" tone="muted">
            {note}
          </AppText>
        ) : null}
        <MoneyField label={strings.fields.amount} value={amount} onChange={setAmount} />
        <TextField
          label={strings.fields.description}
          value={description}
          onChangeText={setDescription}
        />
        {hasCategory ? (
          <ChipSelect
            label={strings.transactions.form.category}
            options={[
              { value: NO_CATEGORY, label: strings.transactions.form.noCategory },
              ...categoryList
                .filter((c) => c.kind === categoryKind)
                .map((c) => ({ value: c.id, label: c.name, color: c.color })),
            ]}
            value={categoryId}
            onChange={setCategoryId}
          />
        ) : null}
        <DateField value={date} onChange={setDate} />
        {tx.kind === 'income' || tx.kind === 'expense' ? (
          <SegmentedControl<TransactionStatus>
            accessibilityLabel={strings.transactions.edit.status}
            options={[
              { value: 'posted', label: strings.transactions.edit.posted },
              { value: 'scheduled', label: strings.transactions.edit.scheduled },
            ]}
            value={status}
            onChange={setStatus}
          />
        ) : null}
        <TextField
          label={strings.transactions.form.notes}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Button
          label={strings.common.save}
          block
          disabled={!valid}
          loading={busy}
          onPress={() => void save()}
        />
        <Button
          label={
            tx.installmentTotal && tx.installmentGroupId
              ? strings.transactions.edit.deleteInstallments(tx.installmentTotal)
              : strings.transactions.edit.delete
          }
          icon={Trash2}
          variant="danger"
          block
          onPress={() => void remove()}
        />
      </Screen>
    </>
  );
}
