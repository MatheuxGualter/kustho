/**
 * Datas de lançamento são strings locais `YYYY-MM-DD` no fuso do aparelho.
 * Nada aqui converte para UTC: a aritmética é feita sobre ano/mês/dia inteiros.
 */

/** Data de competência local: `YYYY-MM-DD`. */
export type ISODate = string;
/** Mês de referência: `YYYY-MM`. */
export type YearMonth = string;

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isYearMonth(value: string): value is YearMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function isISODate(value: string): value is ISODate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function parseISODate(date: ISODate): { year: number; month: number; day: number } {
  if (!isISODate(date)) throw new Error(`Data inválida: ${date}`);
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function parseYearMonth(ym: YearMonth): { year: number; month: number } {
  if (!isYearMonth(ym)) throw new Error(`Mês inválido: ${ym}`);
  const [year, month] = ym.split('-').map(Number);
  return { year, month };
}

export function formatYearMonth(year: number, month: number): YearMonth {
  return `${pad(year, 4)}-${pad(month)}`;
}

export function formatISODate(year: number, month: number, day: number): ISODate {
  return `${formatYearMonth(year, month)}-${pad(day)}`;
}

/** Converte um `Date` para a data local do aparelho. */
export function toISODate(date: Date): ISODate {
  return formatISODate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function monthOf(date: ISODate): YearMonth {
  return date.slice(0, 7);
}

export function currentMonth(): YearMonth {
  return monthOf(today());
}

/**
 * Dia `day` do mês `ym`. Se o mês não tem esse dia (29, 30 ou 31 em mês curto),
 * cai no último dia do mês.
 */
export function dateInMonth(ym: YearMonth, day: number): ISODate {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(`Dia inválido: ${day}`);
  const { year, month } = parseYearMonth(ym);
  return formatISODate(year, month, Math.min(day, daysInMonth(year, month)));
}

export function addMonths(ym: YearMonth, amount: number): YearMonth {
  const { year, month } = parseYearMonth(ym);
  const index = year * 12 + (month - 1) + amount;
  return formatYearMonth(Math.floor(index / 12), (index % 12) + 1);
}

/** Dias desde 0000-03-01, contados só com inteiros (sem fuso nem horário de verão). */
function toDayNumber(date: ISODate): number {
  const { year, month, day } = parseISODate(date);
  const y = month <= 2 ? year - 1 : year;
  const m = month <= 2 ? month + 9 : month - 3;
  return (
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) +
    Math.floor((153 * m + 2) / 5) +
    day -
    1
  );
}

function fromDayNumber(n: number): ISODate {
  const era = Math.floor(n / 146097);
  const doe = n - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return formatISODate(year, month, day);
}

export function addDays(date: ISODate, amount: number): ISODate {
  return fromDayNumber(toDayNumber(date) + amount);
}

/** Dias de `from` até `to` (negativo se `to` vem antes). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** Datas ISO ordenam lexicograficamente. */
export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
