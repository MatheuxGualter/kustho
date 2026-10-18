import type { Capture } from '@/domain/types';

import {
  ANON,
  anonymizeText,
  FILL_EXPECTED,
  summarizeByPackage,
  toFixtureExport,
} from '../diagnostics';
import { parsers } from '../parsers';
import { parseNotification } from '../rules';

let n = 0;
function capture(fields: Partial<Capture>): Capture {
  n++;
  return {
    id: `c${n}`,
    rawId: `r${n}`,
    packageName: 'com.nu.production',
    title: null,
    text: null,
    postedAt: '2026-10-18T12:00:00.000Z',
    parser: null,
    amountCents: null,
    kind: null,
    merchant: null,
    date: null,
    cardLastDigits: null,
    suggestedAccountId: null,
    suggestedCardId: null,
    confidence: 0,
    status: 'pending',
    transactionId: null,
    createdAt: 'now',
    updatedAt: 'now',
    deletedAt: null,
    ...fields,
  } as Capture;
}

describe('summarizeByPackage', () => {
  it('conta por app, separa as não interpretadas e ordena pela última', () => {
    const rows = summarizeByPackage([
      capture({ packageName: 'a.b', parser: 'generic', postedAt: '2026-10-10T00:00:00Z' }),
      capture({ packageName: 'c.d', parser: null, postedAt: '2026-10-12T00:00:00Z' }),
      capture({ packageName: 'a.b', parser: null, postedAt: '2026-10-15T00:00:00Z' }),
    ]);
    expect(rows).toEqual([
      { packageName: 'a.b', total: 2, unparsed: 1, lastPostedAt: '2026-10-15T00:00:00Z' },
      { packageName: 'c.d', total: 1, unparsed: 1, lastPostedAt: '2026-10-12T00:00:00Z' },
    ]);
  });
});

describe('anonymizeText', () => {
  it('troca estabelecimento e final do cartão conhecidos', () => {
    expect(
      anonymizeText('Compra de R$ 45,90 em PADARIA DO ZÉ no cartão final 4821', {
        merchant: 'PADARIA DO ZÉ',
        cardLastDigits: '4821',
      }),
    ).toBe(`Compra de R$ 45,90 em ${ANON.merchant} no cartão final ${ANON.cardDigits}`);
  });

  it('troca nomes de Pix, mantendo o valor', () => {
    expect(anonymizeText('Você recebeu um Pix de Maria Aparecida da Silva de R$ 50,00')).toBe(
      `Você recebeu um Pix de ${ANON.person} de R$ 50,00`,
    );
    expect(anonymizeText('Pix enviado para JOAO PEREIRA')).toBe(`Pix enviado para ${ANON.person}`);
  });

  it('troca documentos, contatos, finais mascarados e números longos', () => {
    expect(anonymizeText('CPF 123.456.789-09')).toBe('CPF 000.000.000-00');
    expect(anonymizeText('CNPJ 12.345.678/0001-90')).toBe('CNPJ 00.000.000/0000-00');
    expect(anonymizeText('fale com ana@banco.com.br')).toBe('fale com email@exemplo.com');
    expect(anonymizeText('ligue (34) 99876-5432')).toBe('ligue (00) 00000-0000');
    expect(anonymizeText('cartão ****1234 usado')).toBe('cartão ****0000 usado');
    expect(anonymizeText('Cartão final 9876')).toBe('Cartão final 0000');
    expect(anonymizeText('autorização 98765432')).toBe('autorização 00000000');
  });

  it('troca também os dígitos do CPF que o banco já mascarou', () => {
    expect(anonymizeText('de Maria Souza, CPF XXX.468.266-XX.')).toBe(
      `de ${ANON.person}, CPF XXX.000.000-XX.`,
    );
    expect(anonymizeText('CPF ***.468.266-**')).toBe('CPF XXX.000.000-XX');
  });

  it('não mexe em valores, datas e horas', () => {
    const text = 'Compra de R$ 1.234,56 em 18/10/2026 às 14:32';
    expect(anonymizeText(text)).toBe(text);
  });
});

describe('toFixtureExport', () => {
  it('gera casos no formato das fixtures, que o parser continua entendendo', () => {
    const text = 'Compra de R$ 45,90 APROVADA em PADARIA REAL para o cartão final 4821.';
    const raw = {
      id: 'x',
      key: 'x',
      packageName: 'a.b',
      title: 'Compra aprovada',
      text,
      postedAtMs: 0,
      capturedAtMs: 0,
    };
    const parsed = parseNotification(parsers, raw);
    expect(parsed).not.toBeNull();

    const exported = toFixtureExport([
      capture({
        packageName: 'a.b',
        title: 'Compra aprovada',
        text,
        parser: parsed!.parser,
        ...parsed!.parsed,
      }),
      capture({ packageName: 'a.b', text: 'Algo novo de Maria Souza' }),
    ]);

    const [ok, unparsed] = exported.cases;
    expect(ok.notification.text).not.toContain('PADARIA REAL');
    expect(ok.notification.text).not.toContain('4821');
    expect(ok.expected).toEqual({
      parser: parsed!.parser,
      amountCents: 4590,
      kind: 'card_purchase',
      merchant: ANON.merchant,
      cardLastDigits: ANON.cardDigits,
    });
    // O texto anonimizado ainda passa no parser com o resultado esperado.
    const again = parseNotification(parsers, { ...raw, text: ok.notification.text });
    expect(again?.parsed).toMatchObject({
      merchant: ANON.merchant,
      cardLastDigits: ANON.cardDigits,
      amountCents: 4590,
    });

    expect(unparsed.name).toContain('não interpretada');
    expect(unparsed.notification.text).not.toContain('Maria');
    expect(unparsed.expected).toBe(FILL_EXPECTED);
    expect(unparsed.notification.text).toBe(`Algo novo de ${ANON.person}`);
  });
});

it('o esperado bate com o texto anonimizado (Pix do Itaú com nome e CPF)', () => {
  const text = 'Você recebeu R$ 0,01 de JOAO DA SILVA SAURO, CPF XXX.468.266-XX.';
  const raw = {
    id: 'x',
    key: 'x',
    packageName: 'com.itau',
    title: 'Pix recebido',
    text,
    postedAtMs: 0,
    capturedAtMs: 0,
  };
  const parsed = parseNotification(parsers, raw)!;
  const [only] = toFixtureExport([
    capture({
      packageName: 'com.itau',
      title: 'Pix recebido',
      text,
      parser: parsed.parser,
      ...parsed.parsed,
    }),
  ]).cases;
  expect(only.notification.text).toBe(
    `Você recebeu R$ 0,01 de ${ANON.person}, CPF XXX.000.000-XX.`,
  );
  expect(only.expected).toMatchObject({ amountCents: 1, kind: 'income', merchant: ANON.person });
});
