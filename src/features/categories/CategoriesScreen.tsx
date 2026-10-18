import { router, Stack } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { CategoryKind } from '@/domain/types';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { CategoryIcon } from '@/ui/components/CategoryIcon';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';

const ICON_SIZE = 20;

/** Categorias de despesa e de receita, com quantos lançamentos usam cada uma. */
export function CategoriesScreen() {
  const { categories } = useServices();
  const { colors } = useTheme();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const query = useServiceQuery(async () => {
    const list = await categories.listCategories(kind);
    const usage = await Promise.all(list.map((c) => categories.countUsage(c.id)));
    return list.map((c, i) => ({ ...c, usage: usage[i] }));
  }, [kind]);

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.categories.title }} />
      <Screen edges={['bottom']}>
        <SegmentedControl<CategoryKind>
          options={[
            { value: 'expense', label: strings.categories.expense },
            { value: 'income', label: strings.categories.income },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Button
          label={strings.categories.newCategory}
          icon={Plus}
          block
          onPress={() => router.push({ pathname: '/categoria/nova', params: { kind } })}
        />
        {!query.data ? (
          <SkeletonRows />
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface">
            {query.data.map((c, i) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => router.push(`/categoria/${c.id}`)}
                className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <View className="flex-1">
                  <AppText>{c.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {strings.categories.usage(c.usage)}
                  </AppText>
                </View>
                <ChevronRight size={ICON_SIZE} color={colors['text-muted']} />
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}
