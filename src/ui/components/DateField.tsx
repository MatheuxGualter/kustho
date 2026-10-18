import { useState } from 'react';
import { View } from 'react-native';

import { addDays, formatDateBR, type ISODate, maskDateBR, parseDateBR, today } from '@/lib/dates';
import { strings } from '@/lib/strings';

import { AppText } from './AppText';
import { SegmentedControl } from './SegmentedControl';
import { TextField } from './TextField';

type Choice = 'today' | 'yesterday' | 'other';

/** Data de competência: atalhos Hoje e Ontem, ou digitada em DD/MM/AAAA. */
export function DateField({ value, onChange }: { value: ISODate; onChange: (d: ISODate) => void }) {
  const now = today();
  const yesterday = addDays(now, -1);
  const [choice, setChoice] = useState<Choice>(
    value === now ? 'today' : value === yesterday ? 'yesterday' : 'other',
  );
  const [text, setText] = useState(formatDateBR(value));
  const [invalid, setInvalid] = useState(false);

  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {strings.fields.date}
      </AppText>
      <SegmentedControl<Choice>
        accessibilityLabel={strings.fields.date}
        options={[
          { value: 'today', label: strings.fields.today },
          { value: 'yesterday', label: strings.fields.yesterday },
          { value: 'other', label: strings.fields.otherDate },
        ]}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          if (next === 'today') onChange(now);
          if (next === 'yesterday') onChange(yesterday);
        }}
      />
      {choice === 'other' ? (
        <TextField
          label={strings.fields.date}
          placeholder={strings.fields.datePlaceholder}
          keyboardType="number-pad"
          maxLength={10}
          value={text}
          error={invalid ? strings.fields.invalidDate : undefined}
          onChangeText={(next) => {
            const masked = maskDateBR(next);
            setText(masked);
            const parsed = parseDateBR(masked);
            // Só acusa erro com a data completa, não enquanto a pessoa ainda digita.
            setInvalid(masked.length === 10 && parsed === null);
            if (parsed) onChange(parsed);
          }}
        />
      ) : null}
    </View>
  );
}
