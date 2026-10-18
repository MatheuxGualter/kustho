import type { ISODate } from '@/domain/types';
import { addDays, dateInMonth, monthOf, startOfWeek } from '@/lib/dates';

export const periods = ['day', 'week', 'month', 'year'] as const;
export type Period = (typeof periods)[number];

/** Intervalo (inclusivo) do período que contém `today`: dia, semana (seg–dom), mês ou ano. */
export function periodRange(period: Period, today: ISODate): { from: ISODate; to: ISODate } {
  switch (period) {
    case 'day':
      return { from: today, to: today };
    case 'week': {
      const from = startOfWeek(today);
      return { from, to: addDays(from, 6) };
    }
    case 'month':
      return { from: `${monthOf(today)}-01`, to: dateInMonth(monthOf(today), 31) };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}
