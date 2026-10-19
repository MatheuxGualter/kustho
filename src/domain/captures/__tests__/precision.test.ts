import type { Capture } from '@/domain/types';

import { AUTO_CONFIRM_MIN_SAMPLE, shouldAutoConfirm, sourceStats } from '../precision';
import { captureExtrasDefaults } from '../rules';

const NU = 'com.nu.production';
const ITAU = 'com.itau';

const capture = (fields: Partial<Capture> = {}): Capture => ({
  id: 'cap',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  rawId: 'raw',
  packageName: NU,
  title: null,
  text: null,
  postedAt: '2026-10-18T15:00:00.000Z',
  parser: 'generic',
  amountCents: 4590,
  kind: 'expense',
  merchant: 'PADARIA',
  date: '2026-10-18',
  cardLastDigits: null,
  suggestedAccountId: 'acc',
  suggestedCardId: null,
  confidence: 0.7,
  status: 'pending',
  transactionId: null,
  ...captureExtrasDefaults,
  ...fields,
});

const confirmed = (n: number, fields: Partial<Capture> = {}) =>
  Array.from({ length: n }, () => capture({ status: 'confirmed', ...fields }));

const source = (packageName: string, autoConfirm: boolean) => ({
  packageName,
  autoConfirm,
  deletedAt: null,
});

describe('sourceStats', () => {
  it('precisão = confirmadas sem edição ÷ confirmadas, por fonte', () => {
    const list = [
      ...confirmed(3),
      ...confirmed(1, { editedOnConfirm: true }),
      ...confirmed(2, { packageName: ITAU }),
    ];
    expect(sourceStats(list, [])).toEqual([
      expect.objectContaining({ packageName: NU, confirmed: 4, unedited: 3, precision: 0.75 }),
      expect.objectContaining({ packageName: ITAU, confirmed: 2, unedited: 2, precision: 1 }),
    ]);
  });

  it('pendentes, descartadas, excluídas e automáticas não contam', () => {
    const list = [
      capture(),
      capture({ status: 'discarded' }),
      ...confirmed(1, { deletedAt: '2026-10-18T00:00:00.000Z' }),
      ...confirmed(5, { autoConfirmed: true }),
    ];
    expect(sourceStats(list, [])).toEqual([]);
  });

  it(`libera só com ${AUTO_CONFIRM_MIN_SAMPLE} confirmações e 95% sem edição`, () => {
    const few = sourceStats(confirmed(AUTO_CONFIRM_MIN_SAMPLE - 1), []);
    expect(few[0]).toMatchObject({ precision: 1, eligible: false });

    const good = [...confirmed(19), ...confirmed(1, { editedOnConfirm: true })];
    expect(sourceStats(good, [])[0]).toMatchObject({ precision: 0.95, eligible: true });

    const bad = [...confirmed(18), ...confirmed(2, { editedOnConfirm: true })];
    expect(sourceStats(bad, [])[0]).toMatchObject({ precision: 0.9, eligible: false });
  });

  it('mostra a chave da configuração, também de fonte ainda sem confirmações', () => {
    const stats = sourceStats(confirmed(1), [source(NU, true), source(ITAU, false)]);
    expect(stats).toEqual([
      expect.objectContaining({ packageName: NU, autoConfirm: true }),
      expect.objectContaining({
        packageName: ITAU,
        confirmed: 0,
        precision: null,
        eligible: false,
      }),
    ]);
  });
});

describe('shouldAutoConfirm', () => {
  const on = { ...sourceStats(confirmed(20), [source(NU, true)])[0] };

  it('fonte ligada e acima do portão, captura pronta: lança sozinho', () => {
    expect(shouldAutoConfirm(capture(), on)).toBe(true);
  });

  it('chave desligada ou fonte abaixo do portão: fica pendente', () => {
    expect(shouldAutoConfirm(capture(), { ...on, autoConfirm: false })).toBe(false);
    expect(shouldAutoConfirm(capture(), { ...on, eligible: false })).toBe(false);
    expect(shouldAutoConfirm(capture(), undefined)).toBe(false);
  });

  it('incompleta, não interpretada, com vínculo sugerido, estorno ou duplicata: fica pendente', () => {
    expect(shouldAutoConfirm(capture({ suggestedAccountId: null }), on)).toBe(false);
    expect(shouldAutoConfirm(capture({ parser: null }), on)).toBe(false);
    expect(shouldAutoConfirm(capture({ matchTransactionId: 'tx' }), on)).toBe(false);
    expect(shouldAutoConfirm(capture({ kind: 'card_refund', matchTransactionId: null }), on)).toBe(
      false,
    );
    expect(shouldAutoConfirm(capture({ duplicateOfId: 'x' }), on)).toBe(false);
  });
});
