import {
  addDays,
  addMonths,
  compareDates,
  dateInMonth,
  dayPeriod,
  daysBetween,
  daysInMonth,
  formatDateBR,
  formatMonthLong,
  formatMonthTitle,
  isISODate,
  isYearMonth,
  lastDayOfMonth,
  maskDateBR,
  monthOf,
  parseDateBR,
  parseISODate,
  startOfWeek,
  toISODate,
  weekday,
} from '../dates';

describe('validação', () => {
  it.each(['2026-10-17', '2024-02-29', '2026-12-31'])('%s é data válida', (d) => {
    expect(isISODate(d)).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-1-1', '17/10/2026', '2026-04-31'])(
    '%s não é data válida',
    (d) => {
      expect(isISODate(d)).toBe(false);
    },
  );

  it('valida mês de referência', () => {
    expect(isYearMonth('2026-10')).toBe(true);
    expect(isYearMonth('2026-13')).toBe(false);
    expect(isYearMonth('2026-1')).toBe(false);
  });
});

describe('toISODate', () => {
  it('usa o fuso local, nunca UTC', () => {
    // 23:30 local do dia 17 continua sendo dia 17, mesmo que em UTC já seja 18.
    expect(toISODate(new Date(2026, 9, 17, 23, 30))).toBe('2026-10-17');
    expect(toISODate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('daysInMonth', () => {
  it('considera anos bissextos', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('dateInMonth (dia inexistente cai no último dia do mês)', () => {
  it.each([
    ['2026-02', 31, '2026-02-28'],
    ['2024-02', 30, '2024-02-29'],
    ['2026-04', 31, '2026-04-30'],
    ['2026-10', 31, '2026-10-31'],
    ['2026-10', 5, '2026-10-05'],
  ])('%s dia %i → %s', (ym, day, expected) => {
    expect(dateInMonth(ym, day)).toBe(expected);
  });

  it('rejeita dia fora de 1–31', () => {
    expect(() => dateInMonth('2026-10', 0)).toThrow();
    expect(() => dateInMonth('2026-10', 32)).toThrow();
  });
});

describe('aritmética', () => {
  it('addMonths atravessa anos', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', 24)).toBe('2028-10');
  });

  it('addDays atravessa meses e anos', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('daysBetween ignora horário de verão', () => {
    expect(daysBetween('2026-10-17', '2026-10-19')).toBe(2);
    expect(daysBetween('2026-10-19', '2026-10-17')).toBe(-2);
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
  });

  it('monthOf e parseISODate', () => {
    expect(monthOf('2026-10-17')).toBe('2026-10');
    expect(parseISODate('2026-10-17')).toEqual({ year: 2026, month: 10, day: 17 });
  });

  it('compareDates ordena', () => {
    expect(compareDates('2026-10-17', '2026-10-18')).toBeLessThan(0);
    expect(compareDates('2026-10-18', '2026-10-17')).toBeGreaterThan(0);
    expect(compareDates('2026-10-17', '2026-10-17')).toBe(0);
  });
});

describe('datas no formato brasileiro', () => {
  it('formatDateBR', () => {
    expect(formatDateBR('2026-10-07')).toBe('07/10/2026');
  });

  it.each([
    ['17/10/2026', '2026-10-17'],
    ['7/1/2026', '2026-01-07'],
    ['17/10/26', '2026-10-17'],
    [' 29/02/2024 ', '2024-02-29'],
  ])('parseDateBR(%p) → %s', (text, expected) => {
    expect(parseDateBR(text)).toBe(expected);
  });

  it.each(['31/04/2026', '29/02/2026', '2026-10-17', '17-10-2026', ''])(
    'parseDateBR(%p) → null',
    (text) => {
      expect(parseDateBR(text)).toBeNull();
    },
  );

  it('formatMonthLong e lastDayOfMonth', () => {
    expect(formatMonthLong('2026-03')).toBe('março de 2026');
    expect(formatMonthTitle('2026-10')).toBe('Outubro de 2026');
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28');
    expect(lastDayOfMonth('2024-02')).toBe('2024-02-29');
  });
});

describe('máscara e semana', () => {
  it.each([
    ['1', '1'],
    ['171', '17/1'],
    ['17102', '17/10/2'],
    ['17102026', '17/10/2026'],
    ['17/10/2026', '17/10/2026'],
    ['171020269', '17/10/2026'],
  ])('maskDateBR(%p) → %p', (text, expected) => {
    expect(maskDateBR(text)).toBe(expected);
  });

  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'night'],
    [23, 'night'],
  ])('dayPeriod(%i) → %s', (hour, period) => {
    expect(dayPeriod(hour)).toBe(period);
  });

  it('startOfWeek volta para a segunda-feira', () => {
    expect(weekday('2026-10-18')).toBe(0); // domingo
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
  });
});
