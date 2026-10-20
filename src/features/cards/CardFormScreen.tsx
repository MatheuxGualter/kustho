import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { errorMessage } from '@/features/shared/errorMessage';
import { formatDateBR, today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { Button } from '@/ui/components/Button';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';
import { matchBank } from '@/ui/banks/banks';
import { BankPicker } from '@/ui/banks/BankPicker';
import { accentPalette } from '@/ui/tokens';

const required = strings.fields.required;
const day = z.coerce
  .number({ error: strings.cards.form.invalidDay })
  .int(strings.cards.form.invalidDay)
  .min(1, strings.cards.form.invalidDay)
  .max(31, strings.cards.form.invalidDay);

const schema = z.object({
  name: z.string().trim().min(1, required),
  institution: z.string().trim().min(1, required),
  color: z.string(),
  limitCents: z.number({ error: strings.fields.invalidAmount }).int().min(0),
  closingDay: day,
  dueDay: day,
  paymentAccountId: z.string().nullable(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/** Criar cartão (`/cartao/novo`) ou editar (`/cartao/novo?id=…`). */
export function CardFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { cards, accounts } = useServices();
  const accountsQuery = useServiceQuery(() => accounts.listAccountsWithBalance(), []);
  const [loaded, setLoaded] = useState(!id);
  // Fatura atual (fora do cadastro do cartão): a diferença vira "Ajuste da fatura".
  const [invoiceCents, setInvoiceCents] = useState(0);
  const [loadedInvoice, setLoadedInvoice] = useState<{ cents: number; closes: string } | null>(
    null,
  );
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      institution: '',
      color: accentPalette[1],
      limitCents: 0,
      closingDay: '',
      dueDay: '',
      paymentAccountId: null,
    },
  });
  const { control, handleSubmit, formState, setValue } = form;
  const institution = useWatch({ control, name: 'institution' });
  const bank = matchBank(institution);
  const [other, setOther] = useState(false);
  const otherBank = other || (!bank && institution.trim() !== '');

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      cards.getCard(id),
      cards.listCardsWithSummary({ includeArchived: true }),
    ]).then(([card, summaries]) => {
      if (card) form.reset(card);
      const invoice = summaries.find((c) => c.id === id)?.currentInvoice;
      const cents = invoice?.remainingCents ?? 0;
      setInvoiceCents(cents);
      setLoadedInvoice({ cents, closes: invoice ? formatDateBR(invoice.closingDate) : '' });
      setLoaded(true);
    });
  }, [id, cards, form]);

  const submit = handleSubmit(async (values) => {
    try {
      const cardId = id ?? (await cards.createCard(values)).id;
      if (id) await cards.updateCard(id, values);
      // Só lança ajuste quando o valor muda (no cadastro, quando há fatura em andamento).
      if (invoiceCents !== (loadedInvoice?.cents ?? 0)) {
        await cards.adjustCurrentInvoice(cardId, invoiceCents, today());
      }
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    }
  });

  return (
    <>
      <Stack.Screen
        options={{ title: id ? strings.cards.form.editTitle : strings.screens.newCard.title }}
      />
      <Screen edges={['bottom']}>
        {!loaded ? (
          <SkeletonRows />
        ) : (
          <>
            <BankPicker
              value={bank?.id ?? (otherBank ? 'other' : null)}
              onChange={(picked) => {
                setOther(!picked);
                setValue('institution', picked?.name ?? '', { shouldValidate: !!picked });
              }}
            />
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={strings.cards.form.name}
                  placeholder={strings.cards.form.namePlaceholder}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            {otherBank ? (
              <Controller
                control={control}
                name="institution"
                render={({ field, fieldState }) => (
                  <TextField
                    label={strings.cards.form.institution}
                    placeholder={strings.accounts.form.institutionPlaceholder}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ) : null}
            <Controller
              control={control}
              name="limitCents"
              render={({ field, fieldState }) => (
                <MoneyField
                  label={strings.cards.form.limit}
                  value={field.value}
                  onChange={(cents) => field.onChange(cents ?? 0)}
                  error={fieldState.error?.message}
                />
              )}
            />
            <MoneyField
              label={strings.cards.form.currentInvoice}
              hint={
                loadedInvoice?.closes
                  ? strings.cards.form.currentInvoiceEditHint(loadedInvoice.closes)
                  : strings.cards.form.currentInvoiceHint
              }
              value={invoiceCents}
              onChange={(cents) => setInvoiceCents(cents ?? 0)}
            />
            {(['closingDay', 'dueDay'] as const).map((name) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field, fieldState }) => (
                  <TextField
                    label={strings.cards.form[name]}
                    hint={strings.cards.form.dayHint}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={field.value === undefined ? '' : String(field.value)}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ))}
            <Controller
              control={control}
              name="paymentAccountId"
              render={({ field }) => (
                <ChipSelect
                  label={strings.cards.form.paymentAccount}
                  options={(accountsQuery.data ?? []).map((a) => ({
                    value: a.id,
                    label: a.name,
                    color: a.color,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="color"
              render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
            />
            <Button
              label={id ? strings.common.save : strings.cards.form.create}
              block
              loading={formState.isSubmitting}
              onPress={() => void submit()}
            />
          </>
        )}
      </Screen>
    </>
  );
}
