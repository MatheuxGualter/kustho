import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { normalizeSearch } from '@/domain/transactions/rules';
import type { Category } from '@/domain/types';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { CategoryIcon } from '@/ui/components/CategoryIcon';
import { TextField } from '@/ui/components/TextField';
import { breakpoints } from '@/ui/tokens';

/** Busca aparece a partir deste número de categorias. */
const SEARCH_FROM = 9;
/** Nomes de uma palavra só encolhem até este fator antes de cortar. */
const MIN_LABEL_SCALE = 0.7;

/** Largura de cada opção: 3 colunas em tela compacta, 4 no celular, 6 na expandida. */
function columnClass(width: number): string {
  if (width < breakpoints.standard) return 'w-[31%]';
  if (width >= breakpoints.expanded) return 'w-[15%]';
  return 'w-[23%]';
}

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
  const { width } = useWindowDimensions();
  const column = columnClass(width);
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
          hideLabel
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
              className={`min-h-touch ${column} items-center gap-1 rounded-input border px-1 py-2 ${selected ? 'border-brand bg-surface-raised' : 'border-transparent'}`}
            >
              <CategoryIcon icon={c.icon} color={c.color} />
              <CategoryLabel name={c.name} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Nome com espaço quebra em até duas linhas ("Sem / categoria"); palavra única encolhe
 * para caber numa linha ("Alimentação"), em vez de ser cortada no meio.
 */
function CategoryLabel({ name }: { name: string }) {
  const multiWord = name.trim().includes(' ');
  return (
    <AppText
      variant="caption"
      className="text-center"
      numberOfLines={multiWord ? 2 : 1}
      adjustsFontSizeToFit
      minimumFontScale={MIN_LABEL_SCALE}
    >
      {name}
    </AppText>
  );
}
