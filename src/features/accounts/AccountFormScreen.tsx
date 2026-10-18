import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/features/shared/errorMessage';
import { accountTypes } from '@/domain/types';
import { strings } from '@/lib/strings';
import { useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { InstitutionAvatar, suggestInitials } from '@/ui/components/InstitutionAvatar';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';
import { bankIcon, resolveBank } from '@/ui/banks/banks';
import { BankPicker } from '@/ui/banks/BankPicker';
import { accentPalette } from '@/ui/tokens';

const required = strings.fields.required;

const schema = z.object({
  name: z.string().trim().min(1, required),
  type: z.enum(accountTypes),
  institution: z.string().trim().min(1, required),
  /** `bank:<id>` para banco do catálogo ou até 2 iniciais. */
  icon: z.string().trim().min(1, required),
  color: z.string(),
  initialBalanceCents: z.number({ error: strings.fields.invalidAmount }).int(),
});

type FormValues = z.infer<typeof schema>;

const typeOptions = accountTypes.map((value) => ({ value, label: strings.accounts.types[value] }));

const defaults: FormValues = {
  name: '',
  type: 'checking',
  institution: '',
  icon: '',
  color: accentPalette[0],
  initialBalanceCents: 0,
};

/** Criar conta (`/conta/nova`) ou editar (`/conta/nova?id=…`). */
export function AccountFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts } = useServices();
  const [loaded, setLoaded] = useState(!id);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { control, handleSubmit, setValue, getValues, formState } = form;
  const [institution, icon, color, type] = useWatch({
    control,
    name: ['institution', 'icon', 'color', 'type'],
  });
  const isCash = type === 'cash';
  const bank = isCash ? undefined : resolveBank(institution, icon);
  // "Outro" escolhido, ou instituição digitada que não é do catálogo (ex.: ao editar).
  const [other, setOther] = useState(false);
  const otherBank = !isCash && (other || (!bank && institution.trim() !== ''));

  useEffect(() => {
    if (!id) return;
    void accounts.getAccount(id).then((account) => {
      if (account) form.reset(account);
      setLoaded(true);
    });
  }, [id, accounts, form]);

  const submit = handleSubmit(async (values) => {
    try {
      if (id) await accounts.updateAccount(id, values);
      else await accounts.createAccount(values);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    }
  });

  const title = id ? strings.accounts.form.editTitle : strings.screens.newAccount.title;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen edges={['bottom']}>
        {!loaded ? (
          <SkeletonRows />
        ) : (
          <>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SegmentedControl
                  accessibilityLabel={strings.accounts.form.type}
                  options={typeOptions}
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    if (next === 'cash') {
                      // Dinheiro não tem banco: instituição e nome padrão, ícone de carteira.
                      setOther(false);
                      setValue('institution', strings.accounts.cash.institution, {
                        shouldValidate: true,
                      });
                      setValue('icon', suggestInitials(strings.accounts.cash.institution), {
                        shouldValidate: true,
                      });
                      if (!getValues('name').trim()) {
                        setValue('name', strings.accounts.cash.name, { shouldValidate: true });
                      }
                    } else if (getValues('institution') === strings.accounts.cash.institution) {
                      setValue('institution', '');
                      setValue('icon', '');
                    }
                  }}
                />
              )}
            />
            {isCash ? (
              <View className="flex-row items-center gap-3">
                <InstitutionAvatar institution={institution} color={color} accountType="cash" />
                <AppText tone="muted" className="flex-1">
                  {strings.accounts.cash.hint}
                </AppText>
              </View>
            ) : (
              <BankPicker
                value={bank?.id ?? (otherBank ? 'other' : null)}
                onChange={(picked) => {
                  if (picked) {
                    setOther(false);
                    setValue('institution', picked.name, { shouldValidate: true });
                    setValue('icon', bankIcon(picked.id), { shouldValidate: true });
                    if (!getValues('name').trim()) {
                      setValue('name', picked.name, { shouldValidate: true });
                    }
                  } else {
                    setOther(true);
                    if (bank) {
                      setValue('institution', '');
                      setValue('icon', '');
                    }
                  }
                }}
              />
            )}
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={strings.accounts.form.name}
                  placeholder={strings.accounts.form.namePlaceholder}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            {otherBank ? (
              <>
                <Controller
                  control={control}
                  name="institution"
                  render={({ field, fieldState }) => (
                    <TextField
                      label={strings.accounts.form.institution}
                      placeholder={strings.accounts.form.institutionPlaceholder}
                      hint={strings.banks.otherHint}
                      value={field.value}
                      onChangeText={(text) => {
                        field.onChange(text);
                        if (!formState.dirtyFields.icon) setValue('icon', suggestInitials(text));
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="icon"
                  render={({ field, fieldState }) => (
                    <TextField
                      label={strings.accounts.form.initials}
                      hint={strings.accounts.form.initialsHint}
                      value={field.value}
                      onChangeText={(text) =>
                        setValue('icon', text.toUpperCase(), { shouldDirty: true })
                      }
                      onBlur={field.onBlur}
                      maxLength={2}
                      autoCapitalize="characters"
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <InstitutionAvatar
                  institution={institution}
                  color={color}
                  icon={icon || suggestInitials(institution)}
                />
              </>
            ) : null}
            <Controller
              control={control}
              name="color"
              render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="initialBalanceCents"
              render={({ field, fieldState }) => (
                <MoneyField
                  label={strings.accounts.form.initialBalance}
                  hint={strings.accounts.form.initialBalanceHint}
                  value={field.value}
                  onChange={(cents) => field.onChange(cents ?? 0)}
                  allowNegative
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button
              label={id ? strings.common.save : strings.accounts.form.create}
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
