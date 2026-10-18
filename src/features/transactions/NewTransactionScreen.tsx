import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/features/shared/errorMessage';
import { compareDates, today } from '@/lib/dates';
import { formatBRL, splitInstallments } from '@/lib/money';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { CategoryPicker } from '@/features/categories/CategoryPicker';
import { useServiceQuery, useServices } from '@/services';
import { AmountKeypad } from '@/ui/components/AmountKeypad';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { DateField } from '@/ui/components/DateField';
import { MoneyText } from '@/ui/components/MoneyText';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';

import { decodeOrigin, encodeOrigin } from './origin';

type Kind = 'expense' | 'income';

const MAX_INSTALLMENTS = 12;
const installmentOptions = Array.from({ length: MAX_INSTALLMENTS }, (_, i) => ({
  value: String(i + 1),
  label: strings.transactions.form.installmentOption(i + 1),
}));

/**
 * Novo lançamento. Meta: menos de 5 s — valor, descrição e origem visíveis de cara;
 * categoria, data, parcelas e observações em "Mais opções".
 */
export function NewTransactionScreen() {
  const services = useServices();
  const lastOrigin = usePreferences((s) => s.lastOrigin);
  const setLastOrigin = usePreferences((s) => s.setLastOrigin);

  const query = useServiceQuery(async () => {
    const [accounts, cards, categories] = await Promise.all([
      services.accounts.listAccountsWithBalance(),
      services.cards.listCardsWithSummary(),
      services.categories.listCategories(),
    ]);
    return { accounts, cards, categories };
  }, []);

  const [kind, setKind] = useState<Kind>('expense');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const data = query.data;
  const originOptions = data
    ? [
        ...data.accounts.map((a) => ({
          value: encodeOrigin({ kind: 'account', id: a.id }),
          label: a.name,
          color: a.color,
        })),
        ...(kind === 'expense'
          ? data.cards.map((c) => ({
              value: encodeOrigin({ kind: 'card', id: c.id }),
              label: `${c.name} · ${strings.transactions.form.cardSuffix}`,
              color: c.color,
            }))
          : []),
      ]
    : [];
  // Origem efetiva: a escolhida, a última usada (se ainda vale) ou a primeira conta.
  const chosen =
    [origin, lastOrigin].find((o) => o && originOptions.some((opt) => opt.value === o)) ??
    originOptions[0]?.value ??
    null;
  const decoded = decodeOrigin(chosen);
  const isCard = decoded?.kind === 'card';
  const kindCategories = (data?.categories ?? []).filter((c) => c.kind === kind);

  const missing =
    amount <= 0
      ? strings.transactions.form.needAmount
      : !decoded
        ? strings.transactions.form.needOrigin
        : description.trim() === ''
          ? strings.transactions.form.needDescription
          : null;

  const save = async () => {
    if (missing || !decoded || !chosen) return;
    setBusy(true);
    const common = {
      amountCents: amount,
      date,
      description: description.trim(),
      categoryId,
      notes: notes.trim() || null,
    };
    try {
      if (decoded.kind === 'card') {
        await services.cards.createCardPurchase({ ...common, cardId: decoded.id, installments });
      } else {
        await services.transactions.createTransaction({
          ...common,
          kind,
          accountId: decoded.id,
          status: compareDates(date, today()) > 0 ? 'scheduled' : 'posted',
        });
      }
      setLastOrigin(chosen);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(strings.transactions.saved);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonRows />
      </Screen>
    );
  }
  if (data.accounts.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <AppText tone="muted">{strings.transactions.form.noOrigins}</AppText>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <SegmentedControl<Kind>
        options={[
          { value: 'expense', label: strings.transactions.form.expense },
          { value: 'income', label: strings.transactions.form.income },
        ]}
        value={kind}
        onChange={(next) => {
          setKind(next);
          setCategoryId(null);
          setInstallments(1);
        }}
      />
      <MoneyText
        cents={kind === 'expense' ? -amount : amount}
        tone={amount === 0 ? 'neutral' : kind}
        variant="display"
        hideable={false}
        className="text-center"
        adjustsFontSizeToFit
        numberOfLines={1}
      />
      <TextField
        label={strings.fields.description}
        placeholder={strings.transactions.form.descriptionPlaceholder}
        value={description}
        onChangeText={setDescription}
        returnKeyType="done"
      />
      <ChipSelect
        label={
          kind === 'expense'
            ? strings.transactions.form.origin
            : strings.transactions.form.destination
        }
        options={originOptions}
        value={chosen}
        onChange={setOrigin}
      />
      <AmountKeypad value={amount} onChange={setAmount} />

      <Button
        label={more ? strings.transactions.form.lessOptions : strings.transactions.form.moreOptions}
        icon={more ? ChevronUp : ChevronDown}
        variant="ghost"
        onPress={() => setMore((v) => !v)}
      />
      {more ? (
        <View className="gap-4">
          <CategoryPicker
            label={strings.transactions.form.category}
            categories={kindCategories}
            value={categoryId}
            onChange={setCategoryId}
          />
          <DateField value={date} onChange={setDate} />
          {!isCard && compareDates(date, today()) > 0 ? (
            <AppText variant="caption" tone="muted">
              {strings.transactions.form.scheduledHint}
            </AppText>
          ) : null}
          {isCard ? (
            <>
              <ChipSelect
                label={strings.transactions.form.installments}
                options={installmentOptions}
                value={String(installments)}
                onChange={(v) => setInstallments(Number(v))}
              />
              {installments > 1 && amount >= installments ? (
                <AppText variant="caption" tone="muted" numeric>
                  {strings.transactions.form.installmentHint(
                    installments,
                    formatBRL(splitInstallments(amount, installments)[installments - 1]),
                  )}
                </AppText>
              ) : null}
            </>
          ) : null}
          <TextField
            label={strings.transactions.form.notes}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
      ) : null}

      <Button
        label={strings.transactions.form.save}
        block
        disabled={missing !== null}
        loading={busy}
        onPress={() => void save()}
      />
      {missing && amount > 0 ? (
        <AppText variant="caption" tone="muted" className="text-center">
          {missing}
        </AppText>
      ) : null}
    </Screen>
  );
}
