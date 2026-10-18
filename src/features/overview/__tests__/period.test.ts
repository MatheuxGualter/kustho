import { periodRange } from '../period';

describe('periodRange', () => {
  const today = '2026-10-21'; // quarta-feira

  it.each([
    ['day', '2026-10-21', '2026-10-21'],
    ['week', '2026-10-19', '2026-10-25'],
    ['month', '2026-10-01', '2026-10-31'],
    ['year', '2026-01-01', '2026-12-31'],
  ] as const)('%s → %s a %s', (period, from, to) => {
    expect(periodRange(period, today)).toEqual({ from, to });
  });

  it('semana que atravessa o mês', () => {
    expect(periodRange('week', '2026-11-01')).toEqual({ from: '2026-10-26', to: '2026-11-01' });
  });

  it('fevereiro termina no último dia', () => {
    expect(periodRange('month', '2026-02-10').to).toBe('2026-02-28');
  });
});
