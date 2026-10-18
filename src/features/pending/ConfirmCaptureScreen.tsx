import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';

import type { CardWithSummary } from '@/domain/contracts';
import type { AccountWithBalance, Capture, CaptureKind, Category } from '@/domain/types';
import { CategoryPicker } from '@/features/categories/CategoryPicker';
import { errorMessage } from '@/features/shared/errorMessage';
import { toISODate } from '@/lib/dates';
import { formatBRL, splitInstallments } from '@/lib/money';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { DateField } from '@/ui/components/DateField';
import { EmptyState } from '@/ui/components/EmptyState';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';

const MAX_INSTALLMENTS = 12;
const installmentOptions = Array.from({ length: MAX_INSTALLMENTS }, (_, i) => ({
  value: String(i + 1),
  label: strings.transactions.form.installmentOption(i + 1),
}));

/** Completar ou ajustar uma captura antes de virar lançamento (Fase 2, trilha D). */
export function ConfirmCaptureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const services = useServices();
  const query = useServiceQuery(async () => {
    const [capture, accounts, cards, categories] = await Promise.all([
      services.captures.getCapture(id),
      services.accounts.listAccountsWithBalance(),
      services.cards.listCardsWithSummary(),
      services.categories.listCategories(),
    ]);
    return { capture, accounts, cards, categories };
  }, [id]);

  const data = query.data;
  if (!data) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonRows />
      </Screen>
    );
  }
  if (!data.capture || data.capture.status !== 'pending') {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon={X} title={strings.errors.domain.not_found} />
      </Screen>
    );
  }
  return <ConfirmForm {...data} capture={data.capture} />;
}

function ConfirmForm({
  capture,
  accounts,
  cards,
  categories,
}: {
  capture: Capture;
  accounts: AccountWithBalance[];
  cards: CardWithSummary[];
  categories: Category[];
}) {
  const services = useServices();
  const [kind, setKind] = useState<CaptureKind>(capture.kind ?? 'expense');
  const [amount, setAmount] = useState<number | null>(capture.amountCents);
  const [description, setDescription] = useState(capture.merchant ?? capture.title ?? '');
  const [date, setDate] = useState(capture.date ?? toISODate(new Date(capture.postedAt)));
  const [accountId, setAccountId] = useState(capture.suggestedAccountId);
  const [cardId, setCardId] = useState(capture.suggestedCardId);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [installments, setInstallments] = useState(1);
  const [busy, setBusy] = useState(false);

  const isCard = kind === 'card_purchase';
  const origin = isCard ? cardId : accountId;
  const categoryKind = kind === 'income' ? 'income' : 'expense';
  const missing =
    !amount || amount <= 0
      ? strings.pending.needAmount
      : !origin
        ? strings.pending.needOrigin
        : description.trim() === ''
          ? strings.pending.needDescription
          : null;

  const confirm = async () => {
    if (missing || !amount) return;
    setBusy(true);
    try {
      await services.captures.confirmCapture(capture.id, {
        kind,
        amountCents: amount,
        date,
        description: description.trim(),
        categoryId,
        ...(isCard ? { cardId: cardId!, installments } : { accountId: accountId! }),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(strings.pending.confirmed);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  const discard = async () => {
    try {
      await services.captures.discardCapture(capture.id);
      showToast(strings.pending.discarded, () => {
        void services.captures.restoreCapture(capture.id);
      });
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Card>
        <AppText variant="caption" tone="muted">
          {strings.pending.original}
        </AppText>
        {capture.title ? <AppText variant="label">{capture.title}</AppText> : null}
        {capture.text ? <AppText variant="caption">{capture.text}</AppText> : null}
      </Card>

      <SegmentedControl<CaptureKind>
        options={[
          { value: 'expense', label: strings.pending.kinds.expense },
          { value: 'income', label: strings.pending.kinds.income },
          { value: 'card_purchase', label: strings.pending.kinds.card_purchase },
        ]}
        value={kind}
        onChange={(next) => {
          setKind(next);
          setCategoryId(null);
        }}
      />
      <MoneyField label={strings.fields.amount} value={amount} onChange={setAmount} />
      <TextField
        label={strings.fields.description}
        value={description}
        onChangeText={setDescription}
        returnKeyType="done"
      />
      {isCard ? (
        <ChipSelect
          label={strings.pending.card}
          options={cards.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
          value={cardId}
          onChange={setCardId}
        />
      ) : (
        <ChipSelect
          label={strings.pending.origin}
          options={accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))}
          value={accountId}
          onChange={setAccountId}
        />
      )}
      <DateField value={date} onChange={setDate} />
      <CategoryPicker
        label={strings.transactions.form.category}
        categories={categories.filter((c) => c.kind === categoryKind)}
        value={categoryId}
        onChange={setCategoryId}
      />
      {isCard ? (
        <>
          <ChipSelect
            label={strings.transactions.form.installments}
            options={installmentOptions}
            value={String(installments)}
            onChange={(v) => setInstallments(Number(v))}
          />
          {installments > 1 && amount && amount >= installments ? (
            <AppText variant="caption" tone="muted" numeric>
              {strings.transactions.form.installmentHint(
                installments,
                formatBRL(splitInstallments(amount, installments)[installments - 1]),
              )}
            </AppText>
          ) : null}
        </>
      ) : null}

      <Button
        label={strings.pending.confirm}
        icon={Check}
        block
        disabled={missing !== null}
        loading={busy}
        onPress={() => void confirm()}
      />
      {missing ? (
        <AppText variant="caption" tone="muted" className="text-center">
          {missing}
        </AppText>
      ) : null}
      <Button
        label={strings.pending.discard}
        icon={X}
        variant="ghost"
        block
        disabled={busy}
        onPress={() => void discard()}
      />
    </Screen>
  );
}
