import { View } from 'react-native';

import type { CardWithSummary } from '@/domain/contracts';
import { formatDateBR } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { InstitutionAvatar } from '@/ui/components/InstitutionAvatar';
import { MoneyText } from '@/ui/components/MoneyText';

/**
 * Cartão estilizado: faixa na cor do cartão, fatura atual com vencimento e barra de limite
 * usado. O texto fica sobre a superfície neutra, para manter contraste com qualquer cor.
 */
export function CreditCardVisual({
  card,
  onPress,
}: {
  card: CardWithSummary;
  onPress?: () => void;
}) {
  const hideValues = usePreferences((s) => s.hideValues);
  const invoice = card.currentInvoice;
  const usedCents = Math.max(0, card.limitCents - card.availableLimitCents);
  const usedRatio = card.limitCents > 0 ? Math.min(1, usedCents / card.limitCents) : 0;

  return (
    <Card onPress={onPress} accessibilityLabel={card.name} className="overflow-hidden p-0">
      <View className="h-2" style={{ backgroundColor: card.color }} />
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <InstitutionAvatar institution={card.institution} color={card.color} />
          <View className="flex-1">
            <AppText variant="label" className="text-base" numberOfLines={1}>
              {card.name}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {card.archivedAt ? strings.cards.archivedBadge : card.institution}
            </AppText>
          </View>
        </View>
        <View className="flex-row flex-wrap items-end justify-between gap-2">
          <View className="gap-1">
            <AppText variant="caption" tone="muted">
              {strings.cards.currentInvoice}
            </AppText>
            <MoneyText cents={invoice?.remainingCents ?? 0} variant="title" />
          </View>
          {invoice ? (
            <AppText variant="caption" tone="muted">
              {strings.cards.dueOn(formatDateBR(invoice.dueDate))}
            </AppText>
          ) : null}
        </View>
        <View
          className="h-2 overflow-hidden rounded-full bg-surface-raised"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(usedRatio * 100) }}
        >
          <View
            className="h-2 rounded-full"
            style={{ width: `${usedRatio * 100}%`, backgroundColor: card.color }}
          />
        </View>
        <View className="gap-1">
          <AppText variant="caption" tone="muted" numeric>
            {hideValues
              ? strings.money.hidden
              : strings.cards.limitUsed(formatBRL(usedCents), formatBRL(card.limitCents))}
          </AppText>
          <View className="flex-row flex-wrap items-baseline gap-x-1">
            <AppText variant="caption" tone="muted">
              {strings.cards.available}
            </AppText>
            <MoneyText cents={card.availableLimitCents} variant="label" />
          </View>
        </View>
      </View>
    </Card>
  );
}
