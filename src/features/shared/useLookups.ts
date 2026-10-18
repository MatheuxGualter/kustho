import type { Category, CreditCard, Id } from '@/domain/types';
import { useServiceQuery, useServices } from '@/services';

export type Lookups = {
  categoryById: Map<Id, Category>;
  /** Nome da conta ou do cartão de um lançamento. */
  originName: (tx: { accountId: Id | null; cardId: Id | null }) => string;
  cards: CreditCard[];
};

/** Nomes de contas, cartões e categorias para exibir lançamentos (inclui arquivados). */
export function useLookups(): Lookups | undefined {
  const { accounts, cards, categories } = useServices();
  const query = useServiceQuery(async () => {
    const [accountList, cardList, categoryList] = await Promise.all([
      accounts.listAccountsWithBalance({ includeArchived: true }),
      cards.listCardsWithSummary({ includeArchived: true }),
      categories.listCategories(),
    ]);
    const names = new Map<Id, string>([
      ...accountList.map((a) => [a.id, a.name] as const),
      ...cardList.map((c) => [c.id, c.name] as const),
    ]);
    return {
      categoryById: new Map(categoryList.map((c) => [c.id, c])),
      cards: cardList,
      originName: (tx: { accountId: Id | null; cardId: Id | null }) =>
        names.get(tx.cardId ?? tx.accountId ?? '') ?? '',
    };
  }, []);
  return query.data;
}
