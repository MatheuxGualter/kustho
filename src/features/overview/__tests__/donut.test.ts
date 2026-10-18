import { donutSlices } from '../donut';

const t = (categoryId: string | null, expenseCents: number) => ({ categoryId, expenseCents });

describe('donutSlices', () => {
  it('ordena, fecha a volta completa e soma as frações em 1', () => {
    const slices = donutSlices([t('a', 100), t('b', 300)]);
    expect(slices.map((s) => s.categoryId)).toEqual(['b', 'a']);
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
    expect(slices[0].startAngle).toBe(0);
    expect(slices.at(-1)!.endAngle).toBeCloseTo(2 * Math.PI);
  });

  it('agrupa as menores em "Outros" quando passa do máximo', () => {
    const slices = donutSlices(
      [t('a', 50), t('b', 40), t('c', 30), t('d', 20), t('e', 10), t('f', 5)],
      5,
    );
    expect(slices).toHaveLength(5);
    expect(slices.at(-1)).toMatchObject({ others: true, cents: 15 });
  });

  it('exatamente o máximo não cria "Outros"', () => {
    expect(donutSlices([t('a', 1), t('b', 1), t('c', 1)], 3).some((s) => s.others)).toBe(false);
  });

  it('sem despesas, sem fatias', () => {
    expect(donutSlices([])).toEqual([]);
    expect(donutSlices([t('a', 0)])).toEqual([]);
  });
});
