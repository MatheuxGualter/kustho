import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { normalizeSearch } from '@/domain/transactions/rules';
import type { Category } from '@/domain/types';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { CategoryIcon } from '@/ui/components/CategoryIcon';
import { TextField } from '@/ui/components/TextField';

/** Busca aparece a partir deste número de categorias. */
const SEARCH_FROM = 9;

/** Grade de categorias com ícones coloridos e busca; inclui "Sem categoria". */
export function CategoryPicker({
  label,
  categories,
  value,
  onChange,
}: {
  label: string;
  categories: readonly Pick<Category, 'id' | 'name' | 'icon' | 'color'>[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const query = normalizeSearch(search);
  const visible = categories.filter((c) => !query || normalizeSearch(c.name).includes(query));
  const options = [
    { id: null, name: strings.categories.none, icon: 'circle-ellipsis', color: null },
    ...visible,
  ];

  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      {categories.length >= SEARCH_FROM ? (
        <TextField
          label={strings.categories.searchPlaceholder}
          placeholder={strings.categories.searchPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      ) : null}
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {options.map((c) => {
          const selected = c.id === value;
          return (
            <Pressable
              key={c.id ?? 'none'}
              accessibilityRole="radio"
              accessibilityLabel={c.name}
              accessibilityState={{ selected }}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(c.id);
              }}
              className={`min-h-touch w-[23%] items-center gap-1 rounded-input border p-2 ${selected ? 'border-brand bg-surface-raised' : 'border-transparent'}`}
            >
              <CategoryIcon icon={c.icon} color={c.color} />
              <AppText variant="caption" className="text-center" numberOfLines={1}>
                {c.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
