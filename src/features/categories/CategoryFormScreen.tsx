import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { errorMessage } from '@/features/shared/errorMessage';
import type { Category, CategoryKind } from '@/domain/types';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import {
  CategoryIcon,
  type CategoryIconGroup,
  categoryIconGroups,
} from '@/ui/components/CategoryIcon';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';
import { accentPalette } from '@/ui/tokens';

const iconGroups = Object.entries(categoryIconGroups).map(([group, icons]) => ({
  group: group as CategoryIconGroup,
  icons: Object.keys(icons),
}));

/** Nova categoria (`/categoria/nova?kind=`) ou editar/excluir (`/categoria/[id]`). */
export function CategoryFormScreen() {
  const params = useLocalSearchParams<{ id?: string; kind?: CategoryKind }>();
  const { categories } = useServices();
  const query = useServiceQuery(async () => {
    const list = await categories.listCategories();
    const current = params.id ? list.find((c) => c.id === params.id) : undefined;
    const usage = current ? await categories.countUsage(current.id) : 0;
    return { list, current, usage };
  }, [params.id]);

  if (!query.data) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonRows />
      </Screen>
    );
  }
  return (
    <CategoryForm
      key={query.data.current?.id ?? 'new'}
      current={query.data.current}
      usage={query.data.usage}
      all={query.data.list}
      initialKind={params.kind === 'income' ? 'income' : 'expense'}
    />
  );
}

function CategoryForm({
  current,
  usage,
  all,
  initialKind,
}: {
  current?: Category;
  usage: number;
  all: Category[];
  initialKind: CategoryKind;
}) {
  const { categories } = useServices();
  const [name, setName] = useState(current?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(current?.kind ?? initialKind);
  const [icon, setIcon] = useState(current?.icon ?? 'tag');
  const [color, setColor] = useState(current?.color ?? accentPalette[0]);
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const input = { name, kind, icon, color, parentId: null };
      if (current) await categories.updateCategory(current.id, input);
      else await categories.createCategory(input);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  const remove = () => {
    if (!current) return;
    const run = () =>
      void categories
        .deleteCategory(current.id, moveTo ?? undefined)
        .then(() => {
          router.back();
          showToast(
            strings.categories.delete.done,
            usage === 0 ? () => void categories.restoreCategory(current.id) : undefined,
          );
        })
        .catch((e: unknown) => showToast(errorMessage(e)));
    if (usage > 0) {
      Alert.alert(strings.categories.delete.action, strings.categories.delete.moveTo(usage), [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.categories.delete.confirm, style: 'destructive', onPress: run },
      ]);
    } else run();
  };

  const moveOptions = all
    .filter((c) => c.kind === current?.kind && c.id !== current?.id)
    .map((c) => ({ value: c.id, label: c.name, color: c.color }));

  return (
    <>
      <Stack.Screen
        options={{
          title: current ? strings.categories.form.editTitle : strings.screens.newCategory.title,
        }}
      />
      <Screen edges={['bottom']}>
        <View className="items-center">
          <CategoryIcon icon={icon} color={color} />
        </View>
        <TextField
          label={strings.categories.form.name}
          placeholder={strings.categories.form.namePlaceholder}
          value={name}
          onChangeText={setName}
          autoFocus={!current}
        />
        {!current ? (
          <SegmentedControl<CategoryKind>
            accessibilityLabel={strings.categories.form.kind}
            options={[
              { value: 'expense', label: strings.categories.expense },
              { value: 'income', label: strings.categories.income },
            ]}
            value={kind}
            onChange={setKind}
          />
        ) : null}
        <View className="gap-3">
          <AppText variant="label" tone="muted">
            {strings.categories.form.icon}
          </AppText>
          {iconGroups.map(({ group, icons }) => (
            <View key={group} className="gap-2">
              <AppText variant="caption" tone="muted">
                {strings.categories.iconGroups[group]}
              </AppText>
              <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
                {icons.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={strings.categories.form.iconOption(option)}
                    accessibilityState={{ selected: option === icon }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setIcon(option);
                    }}
                    className={`rounded-full border-2 ${option === icon ? 'border-brand' : 'border-transparent'}`}
                  >
                    <CategoryIcon icon={option} color={color} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
        <ColorPicker value={color} onChange={setColor} />
        <Button
          label={current ? strings.common.save : strings.categories.form.create}
          block
          disabled={name.trim() === ''}
          loading={busy}
          onPress={() => void save()}
        />
        {current ? (
          <View className="gap-3 pt-4">
            {usage > 0 ? (
              <ChipSelect
                label={strings.categories.delete.moveTo(usage)}
                options={moveOptions}
                value={moveTo}
                onChange={setMoveTo}
              />
            ) : null}
            <Button
              label={strings.categories.delete.action}
              icon={Trash2}
              variant="danger"
              block
              disabled={usage > 0 && !moveTo}
              onPress={remove}
            />
          </View>
        ) : null}
      </Screen>
    </>
  );
}
