import { cycleForPurchase, cycleForReferenceMonth, installmentCycles } from '../cycle';

// Fechamento dia 3, vencimento dia 10 (vence no mesmo mês do fechamento).
const nubank = { closingDay: 3, dueDay: 10 };
// Fechamento dia 25, vencimento dia 5 (vence no mês seguinte ao fechamento).
const inter = { closingDay: 25, dueDay: 5 };
// Fechamento dia 31: cai no último dia em meses curtos.
const endOfMonth = { closingDay: 31, dueDay: 8 };

describe('cycleForReferenceMonth', () => {
  it('vencimento depois do fechamento: ambos no mês de referência', () => {
    expect(cycleForReferenceMonth(nubank, '2026-11')).toEqual({
      referenceMonth: '2026-11',
      closingDate: '2026-11-03',
      dueDate: '2026-11-10',
    });
  });

  it('vencimento antes do fechamento: fecha no mês anterior ao de referência', () => {
    expect(cycleForReferenceMonth(inter, '2026-11')).toEqual({
      referenceMonth: '2026-11',
      closingDate: '2026-10-25',
      dueDate: '2026-11-05',
    });
  });

  it('dia inexistente cai no último dia do mês', () => {
    expect(cycleForReferenceMonth(endOfMonth, '2026-03').closingDate).toBe('2026-02-28');
    expect(cycleForReferenceMonth(endOfMonth, '2024-03').closingDate).toBe('2024-02-29');
    expect(cycleForReferenceMonth(endOfMonth, '2026-05').closingDate).toBe('2026-04-30');
  });
});

describe('cycleForPurchase', () => {
  it('compra antes do fechamento entra na fatura que fecha naquele mês', () => {
    expect(cycleForPurchase(nubank, '2026-11-02').referenceMonth).toBe('2026-11');
  });

  it('compra no próprio dia do fechamento entra na fatura seguinte', () => {
    expect(cycleForPurchase(nubank, '2026-11-03').referenceMonth).toBe('2026-12');
  });

  it('compra depois do fechamento entra na fatura seguinte', () => {
    expect(cycleForPurchase(nubank, '2026-11-20')).toEqual({
      referenceMonth: '2026-12',
      closingDate: '2026-12-03',
      dueDate: '2026-12-10',
    });
  });

  it('vencimento no mês seguinte ao fechamento', () => {
    expect(cycleForPurchase(inter, '2026-10-24').referenceMonth).toBe('2026-11');
    expect(cycleForPurchase(inter, '2026-10-25').referenceMonth).toBe('2026-12');
  });

  it('virada de ano', () => {
    expect(cycleForPurchase(nubank, '2026-12-15').referenceMonth).toBe('2027-01');
    expect(cycleForPurchase(inter, '2026-12-28')).toEqual({
      referenceMonth: '2027-02',
      closingDate: '2027-01-25',
      dueDate: '2027-02-05',
    });
  });

  it('fechamento no dia 31 em fevereiro: dia 28 já é o dia do fechamento', () => {
    expect(cycleForPurchase(endOfMonth, '2026-02-27').closingDate).toBe('2026-02-28');
    expect(cycleForPurchase(endOfMonth, '2026-02-28').closingDate).toBe('2026-03-31');
  });

  it('vencimento no mesmo dia do fechamento vai para o mês seguinte', () => {
    expect(cycleForReferenceMonth({ closingDay: 10, dueDay: 10 }, '2026-11')).toEqual({
      referenceMonth: '2026-11',
      closingDate: '2026-10-10',
      dueDate: '2026-11-10',
    });
  });
});

describe('installmentCycles', () => {
  it('uma parcela em cada fatura seguinte', () => {
    expect(installmentCycles(nubank, '2026-11-20', 3).map((c) => c.referenceMonth)).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('rejeita número de parcelas inválido', () => {
    expect(() => installmentCycles(nubank, '2026-11-20', 0)).toThrow();
  });
});
