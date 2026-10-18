/**
 * Diagnóstico da captura (Fase 2, trilha B): resumo por app e exportação anonimizada no
 * formato das fixtures dos parsers (`parsers/__fixtures__/`).
 */
import type { Capture } from '@/domain/types';

export type PackageSummary = {
  packageName: string;
  total: number;
  /** Nenhum parser reconheceu: viram fixtures novas. */
  unparsed: number;
  lastPostedAt: string;
};

/** Uma linha por app, do que notificou por último para o mais antigo. */
export function summarizeByPackage(captures: readonly Capture[]): PackageSummary[] {
  const map = new Map<string, PackageSummary>();
  for (const c of captures) {
    const row = map.get(c.packageName) ?? {
      packageName: c.packageName,
      total: 0,
      unparsed: 0,
      lastPostedAt: c.postedAt,
    };
    row.total++;
    if (c.parser === null) row.unparsed++;
    if (c.postedAt > row.lastPostedAt) row.lastPostedAt = c.postedAt;
    map.set(c.packageName, row);
  }
  return [...map.values()].sort((a, b) => b.lastPostedAt.localeCompare(a.lastPostedAt));
}

export const ANON = {
  merchant: 'ESTABELECIMENTO EXEMPLO',
  person: 'FULANO DE TAL',
  cardDigits: '0000',
} as const;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Nome próprio depois de "de/para/por" (Pix): duas ou mais palavras com inicial maiúscula.
const NAME_WORD = "[A-ZÀ-Ý][A-Za-zÀ-ÿ'’]+";
const PERSON = new RegExp(
  `\\b(de|para|por)\\s+(${NAME_WORD}(?:\\s+(?:d[aeo]s?\\s+)?${NAME_WORD})+)`,
  'g',
);

/**
 * Tira do texto o que identifica alguém: estabelecimento, final do cartão, nomes de quem
 * mandou ou recebeu um Pix, CPF/CNPJ, e-mail, telefone e números longos (conta, código).
 * Heurística: quem exporta ainda confere antes do commit.
 */
export function anonymizeText(
  text: string,
  known: { merchant?: string | null; cardLastDigits?: string | null } = {},
): string {
  let out = text;
  if (known.merchant && known.merchant.trim().length > 1) {
    out = out.replace(new RegExp(escapeRegExp(known.merchant.trim()), 'gi'), ANON.merchant);
  }
  if (known.cardLastDigits) {
    out = out.replace(
      new RegExp(`\\b${escapeRegExp(known.cardLastDigits)}\\b`, 'g'),
      ANON.cardDigits,
    );
  }
  return out
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, 'email@exemplo.com')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '00.000.000/0000-00')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '000.000.000-00')
    .replace(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '(00) 00000-0000')
    .replace(/((?:final|cart[aã]o)\D{0,12})\d{4}\b/gi, `$1${ANON.cardDigits}`)
    .replace(/[*•xX]{2,}\s?\d{4}\b/g, `****${ANON.cardDigits}`)
    .replace(/\b\d{6,}\b/g, (digits) => '0'.repeat(digits.length))
    .replace(PERSON, (_match, prep: string) => `${prep} ${ANON.person}`);
}

export type FixtureCase = {
  name: string;
  notification: { packageName: string; title: string | null; text: string | null };
  /**
   * O que o parser entendeu hoje, já anonimizado. Notificação não interpretada sai com um
   * texto pedindo para preencher: o teste de fixtures falha até alguém completar.
   */
  expected: Record<string, unknown> | string;
};

export const FILL_EXPECTED =
  'PREENCHER: parser, amountCents, kind, merchant e cardLastDigits (ou null se não é transação)';

/** Capturas → `{ cases }` no formato de `parsers/__fixtures__/<banco>.json`. */
export function toFixtureExport(captures: readonly Capture[]): {
  _sobre: string;
  cases: FixtureCase[];
} {
  const cases = captures.map((c, i): FixtureCase => {
    const known = { merchant: c.merchant, cardLastDigits: c.cardLastDigits };
    const anon = (text: string | null) => (text === null ? null : anonymizeText(text, known));
    return {
      name: `${c.packageName} #${i + 1}${c.parser === null ? ' (não interpretada)' : ''}`,
      notification: { packageName: c.packageName, title: anon(c.title), text: anon(c.text) },
      expected:
        c.parser === null
          ? FILL_EXPECTED
          : {
              parser: c.parser,
              amountCents: c.amountCents,
              kind: c.kind,
              merchant: c.merchant ? ANON.merchant : null,
              cardLastDigits: c.cardLastDigits ? ANON.cardDigits : null,
            },
    };
  });
  return {
    _sobre:
      'Exportado pelo diagnóstico do Kustho. Anonimizado automaticamente: confira nomes, valores e estabelecimentos antes do commit.',
    cases,
  };
}
