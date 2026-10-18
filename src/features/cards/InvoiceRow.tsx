import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { InvoiceWithTotals } from '@/domain/contracts';
import { formatDateBR, formatMonthTitle } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { MoneyText } from '@/ui/components/MoneyText';

/** Linha de fatura: mês, situação, vencimento e valor (restante ou total). */
export function InvoiceRow({ invoice }: { invoice: InvoiceWithTotals }) {
  const settled = invoice.status === 'paid';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/fatura/${invoice.id}`)}
      className="min-h-touch flex-row items-center gap-3 bg-surface px-4 py-3 active:opacity-80"
    >
      <View className="flex-1 gap-1">
        <AppText variant="label" className="text-base">
          {formatMonthTitle(invoice.referenceMonth)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {`${strings.cards.status[invoice.status]} · ${strings.cards.dueOn(formatDateBR(invoice.dueDate))}`}
        </AppText>
      </View>
      <MoneyText
        cents={settled ? invoice.totalCents : invoice.remainingCents}
        variant="label"
        className={`text-base ${settled ? 'opacity-50' : ''}`}
      />
    </Pressable>
  );
}
