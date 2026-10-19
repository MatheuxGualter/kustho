/**
 * Confirmar uma captura: cria os lançamentos pelos serviços de lançamentos e cartões. Usado
 * pelo fake e pelo serviço real, para os dois criarem exatamente o mesmo.
 */
import type { CaptureConfirmation, CardsService, TransactionsService } from '@/domain/contracts';
import type { Capture, Transaction } from '@/domain/types';

export async function createFromConfirmation(
  deps: { transactions: TransactionsService; cards: CardsService },
  capture: Pick<Capture, 'channel'>,
  confirmation: CaptureConfirmation,
): Promise<Transaction[]> {
  const { kind, amountCents, date, description, categoryId } = confirmation;
  const source = capture.channel === 'receipt' ? 'receipt' : 'notification';
  switch (kind) {
    case 'card_refund':
      // Trilha C: estorno entra na fatura certa, limitado ao que falta estornar da compra.
      return [await deps.cards.refundCardPurchase(confirmation.refundOfId!, amountCents, date)];
    case 'card_purchase':
      return deps.cards.createCardPurchase({
        cardId: confirmation.cardId!,
        amountCents,
        installments: confirmation.installments ?? 1,
        date,
        description,
        categoryId,
        source,
      });
    default:
      return [
        await deps.transactions.createTransaction({
          kind,
          amountCents,
          date,
          description,
          categoryId,
          accountId: confirmation.accountId!,
          source,
        }),
      ];
  }
}
