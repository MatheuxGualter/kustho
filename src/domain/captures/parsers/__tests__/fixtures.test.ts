/**
 * Roda todas as fixtures de `../__fixtures__/` contra os parsers registrados. Regra da
 * trilha C: toda notificação que falhar no uso real vira uma fixture nova aqui.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RawNotification } from '../../../../../modules/notification-capture/src/NotificationCapture.types';
import { parseNotification } from '../../rules';
import { parsers } from '..';

type Fixture = {
  name: string;
  notification: Pick<RawNotification, 'packageName' | 'title' | 'text'> & {
    postedAtMs?: number;
  };
  expected: Record<string, unknown> | null;
};

const dir = join(__dirname, '..', '__fixtures__');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

// 18/10/2026 15:00 em Brasília: sem data no texto, vale a data local da notificação.
const POSTED_AT = new Date(2026, 9, 18, 15, 0).getTime();

describe.each(files)('%s', (file) => {
  const { cases } = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { cases: Fixture[] };

  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, fixture) => {
    const raw: RawNotification = {
      id: 'fixture',
      key: 'fixture',
      capturedAtMs: POSTED_AT,
      postedAtMs: fixture.notification.postedAtMs ?? POSTED_AT,
      ...fixture.notification,
    };
    const result = parseNotification(parsers, raw);

    if (fixture.expected === null) {
      expect(result).toBeNull();
      return;
    }
    const { parser, ...fields } = fixture.expected;
    expect(result?.parser).toBe(parser);
    expect(result?.parsed).toMatchObject({ date: '2026-10-18', ...fields });
    expect(result?.parsed.confidence).toBeGreaterThan(0);
    expect(result?.parsed.confidence).toBeLessThanOrEqual(1);
  });
});
