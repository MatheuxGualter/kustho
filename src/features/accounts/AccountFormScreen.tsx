import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorMessage } from '@/features/shared/errorMessage';
import { accountTypes } from '@/domain/types';
import { strings } from '@/lib/strings';
import { useServices } from '@/services';
import { Button } from '@/ui/components/Button';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { InstitutionAvatar, suggestInitials } from '@/ui/components/InstitutionAvatar';
import { MoneyField } from '@/ui/components/MoneyField';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';
import { accentPalette } from '@/ui/tokens';

const required = strings.fields.required;

const schema = z.object({
  name: z.string().trim().min(1, required),
  type: z.enum(accountTypes),
  institution: z.string().trim().min(1, required),
  icon: z.string().trim().min(1, required).max(2),
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
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={strings.accounts.form.name}
                  placeholder={strings.accounts.form.namePlaceholder}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  autoFocus={!id}
                />
              )}
            />
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SegmentedControl
                  accessibilityLabel={strings.accounts.form.type}
                  options={typeOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="institution"
              render={({ field, fieldState }) => (
                <TextField
                  label={strings.accounts.form.institution}
                  placeholder={strings.accounts.form.institutionPlaceholder}
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
                  onChange={(cents) => field.onChange(cents ?? Number.NaN)}
                  allowNegative
                  error={fieldState.error?.message}
                />
              )}
            />
            <InstitutionAvatar color={getValues('color')} initials={getValues('icon') || '?'} />
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
