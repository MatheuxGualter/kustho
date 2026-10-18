import {
  appendDigit,
  assertCents,
  formatBRL,
  parseBRL,
  removeLastDigit,
  splitInstallments,
  sumCents,
} from '../money';

// Intl usa espaço não separável entre "R$" e o número.
const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('formatBRL', () => {
  it('formata centavos em reais pt-BR', () => {
    expect(formatBRL(4590)).toBe(nbsp('R$ 45,90'));
    expect(formatBRL(0)).toBe(nbsp('R$ 0,00'));
    expect(formatBRL(5)).toBe(nbsp('R$ 0,05'));
    expect(formatBRL(123456789)).toBe(nbsp('R$ 1.234.567,89'));
  });

  it('formata negativos', () => {
    expect(formatBRL(-4590)).toBe(nbsp('-R$ 45,90'));
  });

  it('mostra o sinal quando pedido', () => {
    expect(formatBRL(4590, { sign: 'always' })).toBe(nbsp('+R$ 45,90'));
    expect(formatBRL(-4590, { sign: 'always' })).toBe(nbsp('-R$ 45,90'));
    expect(formatBRL(0, { sign: 'always' })).toBe(nbsp('R$ 0,00'));
  });

  it('esconde o número no modo ocultar valores', () => {
    expect(formatBRL(4590, { hidden: true })).toBe(nbsp('R$ ••••'));
  });

  it('rejeita valores que não são centavos inteiros', () => {
    expect(() => formatBRL(45.9)).toThrow();
    expect(() => formatBRL(Number.NaN)).toThrow();
  });
});

describe('parseBRL', () => {
  it.each([
    ['45,90', 4590],
    ['R$ 45,90', 4590],
    ['R$ 1.234,56', 123456],
    ['1.234', 123400],
    ['0,5', 50],
    ['10', 1000],
    ['-12,30', -1230],
    ['  7,01 ', 701],
  ])('%s → %i', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,234', '12,3,4', '1.23,00'])('retorna null para %p', (input) => {
    expect(parseBRL(input)).toBeNull();
  });
});

describe('teclado em centavos', () => {
  it('digitar 4590 vira R$ 45,90', () => {
    let cents = 0;
    for (const d of [4, 5, 9, 0]) cents = appendDigit(cents, d);
    expect(cents).toBe(4590);
  });

  it('apagar remove o último dígito', () => {
    expect(removeLastDigit(4590)).toBe(459);
    expect(removeLastDigit(5)).toBe(0);
    expect(removeLastDigit(0)).toBe(0);
  });

  it('ignora dígitos além do limite', () => {
    const max = 99_999_999_99; // R$ 99.999.999,99
    expect(appendDigit(max, 1)).toBe(max);
  });

  it('rejeita dígito inválido', () => {
    expect(() => appendDigit(0, 10)).toThrow();
  });
});

describe('splitInstallments', () => {
  it('põe o resto da divisão na primeira parcela', () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it('divisão exata', () => {
    expect(splitInstallments(12000, 4)).toEqual([3000, 3000, 3000, 3000]);
  });

  it('1 parcela é o valor inteiro', () => {
    expect(splitInstallments(4590, 1)).toEqual([4590]);
  });

  it('a soma das parcelas é sempre o total', () => {
    for (const total of [1, 99, 100, 101, 9999, 123457]) {
      for (let n = 1; n <= 24; n++) {
        if (total < n) continue;
        expect(sumCents(splitInstallments(total, n))).toBe(total);
      }
    }
  });

  it('rejeita entradas inválidas', () => {
    expect(() => splitInstallments(100, 0)).toThrow();
    expect(() => splitInstallments(100, 1.5)).toThrow();
    expect(() => splitInstallments(0, 2)).toThrow();
    expect(() => splitInstallments(2, 3)).toThrow();
  });
});

describe('assertCents', () => {
  it('aceita inteiros seguros', () => {
    expect(() => assertCents(0)).not.toThrow();
    expect(() => assertCents(-100)).not.toThrow();
  });

  it('rejeita frações, NaN e infinitos', () => {
    expect(() => assertCents(0.1)).toThrow();
    expect(() => assertCents(Infinity)).toThrow();
    expect(() => assertCents(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
