import type { CategoryTotal } from '@/domain/contracts';
import type { Cents, Id } from '@/domain/types';

export type Slice = {
  key: string;
  categoryId: Id | null;
  /** `true` na fatia que agrupa as categorias menores. */
  others: boolean;
  cents: Cents;
  /** Fração do total, de 0 a 1. */
  share: number;
  startAngle: number;
  endAngle: number;
};

/**
 * Fatias da rosca de despesas: as `max − 1` maiores categorias e o resto somado em
 * "Outros". Ângulos em radianos, a partir do topo, no sentido horário.
 */
export function donutSlices(totals: readonly CategoryTotal[], max = 5): Slice[] {
  const sorted = [...totals]
    .filter((t) => t.expenseCents > 0)
    .sort((a, b) => b.expenseCents - a.expenseCents);
  const total = sorted.reduce((s, t) => s + t.expenseCents, 0);
  if (total === 0) return [];
  const head = sorted.length > max ? sorted.slice(0, max - 1) : sorted;
  const rest = sorted.slice(head.length);
  const entries = [
    ...head.map((t) => ({
      key: t.categoryId ?? 'none',
      categoryId: t.categoryId,
      others: false,
      cents: t.expenseCents,
    })),
    ...(rest.length > 0
      ? [
          {
            key: 'others',
            categoryId: null,
            others: true,
            cents: rest.reduce((s, t) => s + t.expenseCents, 0),
          },
        ]
      : []),
  ];
  let angle = 0;
  return entries.map((entry) => {
    const share = entry.cents / total;
    const startAngle = angle;
    angle += share * 2 * Math.PI;
    return { ...entry, share, startAngle, endAngle: angle };
  });
}
