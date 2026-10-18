import { CalendarClock } from 'lucide-react-native';
import { View } from 'react-native';

import { today } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { MoneyText } from '@/ui/components/MoneyText';
import { showToast } from '@/ui/components/Toast';
import { useTheme } from '@/ui/theme';

const ICON_SIZE = 20;

/** Lançamentos previstos cuja data chegou: pergunta se já foram efetivados. */
export function DueScheduledBanner() {
  const { transactions } = useServices();
  const { colors } = useTheme();
  const query = useServiceQuery(() => transactions.listDueScheduled(today()), []);
  const due = query.data ?? [];
  if (due.length === 0) return null;

  return (
    <Card>
      <View className="flex-row items-center gap-2">
        <CalendarClock size={ICON_SIZE} color={colors.warning} />
        <AppText variant="label" className="flex-1">
          {strings.transactions.due.title(due.length)}
        </AppText>
      </View>
      <AppText variant="caption" tone="muted">
        {strings.transactions.due.question}
      </AppText>
      {due.map((tx) => (
        <View key={tx.id} className="flex-row items-center gap-3">
          <AppText className="flex-1" numberOfLines={1}>
            {tx.description}
          </AppText>
          <MoneyText
            cents={tx.kind === 'income' ? tx.amountCents : -tx.amountCents}
            variant="label"
          />
          <Button
            label={strings.transactions.due.confirm}
            variant="secondary"
            onPress={() =>
              void transactions
                .confirmScheduled(tx.id)
                .then(() => showToast(strings.transactions.due.confirmed))
            }
          />
        </View>
      ))}
    </Card>
  );
}
