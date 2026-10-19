import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseReceipt } from '../parser';

type Fixture = { name: string; text: string; expected: Record<string, unknown> | null };

const { cases } = JSON.parse(
  readFileSync(join(__dirname, '..', '__fixtures__', 'receipts.json'), 'utf8'),
) as { cases: Fixture[] };

// 19/10/2026 15:00 no fuso local: data usada quando o comprovante não traz a data.
const RECEIVED_AT = new Date(2026, 9, 19, 15, 0).getTime();

it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, fixture) => {
  const result = parseReceipt(fixture.text, RECEIVED_AT);
  if (fixture.expected === null) {
    expect(result).toBeNull();
    return;
  }
  expect(result).toMatchObject(fixture.expected);
  expect(result!.confidence).toBeGreaterThan(0);
  expect(result!.confidence).toBeLessThanOrEqual(1);
});

it('sem data no texto, vale a data local em que chegou', () => {
  expect(parseReceipt('Pix enviado\nValor R$ 5,00\nPara\nFULANO', RECEIVED_AT)?.date).toBe(
    '2026-10-19',
  );
});
