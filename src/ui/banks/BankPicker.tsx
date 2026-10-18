import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { useTheme } from '@/ui/theme';
import { sizes } from '@/ui/tokens';

import { type Bank, type BankId, banks } from './banks';
import { BankLogo } from './BankLogo';

const ICON_SIZE = 20;

/** Grade com os logos dos bancos; "Outro" libera nome e iniciais livres. */
export function BankPicker({
  value,
  onChange,
}: {
  /** Banco escolhido, `'other'` para outra instituição, ou `null` sem escolha. */
  value: BankId | 'other' | null;
  onChange: (bank: Bank | null) => void;
}) {
  const { colors } = useTheme();
  const option = (
    key: string,
    selected: boolean,
    label: string,
    content: ReactNode,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      className={`w-[23%] items-center gap-1 rounded-input border p-2 ${selected ? 'border-brand bg-surface-raised' : 'border-transparent'}`}
    >
      {content}
      <AppText variant="caption" className="text-center" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {strings.banks.label}
      </AppText>
      <View className="flex-row flex-wrap gap-y-2" accessibilityRole="radiogroup">
        {banks.map((bank) =>
          option(bank.id, value === bank.id, bank.name, <BankLogo bank={bank} />, () =>
            onChange(bank),
          ),
        )}
        {option(
          'other',
          value === 'other',
          strings.banks.other,
          <View
            className="items-center justify-center rounded-full border border-border bg-surface"
            style={{ width: sizes.fab, height: sizes.fab }}
          >
            <Plus size={ICON_SIZE} color={colors['text-muted']} />
          </View>,
          () => onChange(null),
        )}
      </View>
    </View>
  );
}
