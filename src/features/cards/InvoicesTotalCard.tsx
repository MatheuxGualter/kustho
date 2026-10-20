import { View } from 'react-native';

import type { CardWithSummary } from '@/domain/contracts';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { MoneyText } from '@/ui/components/MoneyText';

/** Soma do que falta pagar na fatura atual de cada cartão. */
export const invoicesTotalCents = (cards: readonly CardWithSummary[]) =>
  cards.reduce((sum, card) => sum + (card.currentInvoice?.remainingCents ?? 0), 0);

/**
 * Total das faturas atuais. Só aparece com dois cartões ou mais (com um, repetiria o valor
 * do próprio cartão). `row`: linha compacta, como os cartões da Início.
 */
export function InvoicesTotalCard({
  cards,
  layout = 'stacked',
}: {
  cards: readonly CardWithSummary[];
  layout?: 'stacked' | 'row';
}) {
  if (cards.length < 2) return null;
  const total = invoicesTotalCents(cards);
  const hint = strings.cards.invoicesTotalHint(cards.length);

  if (layout === 'row') {
    return (
      <Card accessibilityLabel={strings.cards.invoicesTotal}>
        <View className="flex-row items-center gap-3">
          <View className="flex-1 gap-1">
            <AppText variant="label" className="text-base" numberOfLines={2}>
              {strings.cards.invoicesTotal}
            </AppText>
            <AppText variant="caption" tone="muted">
              {hint}
            </AppText>
          </View>
          <MoneyText cents={total} variant="label" className="text-base" />
        </View>
      </Card>
    );
  }

  return (
    <Card accessibilityLabel={strings.cards.invoicesTotal}>
      <AppText variant="caption" tone="muted">
        {strings.cards.invoicesTotal}
      </AppText>
      <MoneyText cents={total} variant="title" />
      <AppText variant="caption" tone="muted">
        {hint}
      </AppText>
    </Card>
  );
}
