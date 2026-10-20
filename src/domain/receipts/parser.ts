/**
 * Leitor de comprovantes (Fase 3, trilha E): texto de um comprovante de Pix ou
 * transferência — vindo do compartilhar como texto ou do OCR de imagem/PDF — vira os dados
 * de uma captura. Regras puras; na dúvida devolve `null` (não é comprovante).
 *
 * Comprovantes têm rótulos e valores em linhas separadas ou na mesma linha ("Nome FULANO",
 * "instituição: X") e duas seções: quem recebeu (Destino, Para, Quem recebeu…) e quem pagou
 * (Origem, De, Quem pagou…).
 */
import { formatISODate, isISODate, toISODate } from '@/lib/dates';
import { parseBRL } from '@/lib/money';

export type ParsedReceipt = {
  amountCents: number;
  /** Pix enviado vira saída; recebido, entrada. */
  kind: 'expense' | 'income';
  /** Quem recebeu (saída) ou quem pagou (entrada). */
  counterpart: string | null;
  date: string;
  /** Banco do lado do usuário: de onde saiu (saída) ou onde entrou (entrada). */
  institution: string | null;
  /** 0 a 1. */
  confidence: number;
};

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Valor em reais. Tolera o que o OCR costuma errar: `RS` no lugar de `R$`, `R $`, ponto no
 * lugar da vírgula dos centavos (`20.00`) e espaço depois dela (`20, 00`).
 */
const AMOUNT =
  /(?<![A-Za-z])R\s?[$S]\s*(\d{1,3}(?:\.\d{3})+(?:,\s?\d{2})?|\d+[,.]\s?\d{2}(?!\d)|\d+)(?![\d,.]\d)/;
const VALUE_LABEL = /^valor\b/;

const INCOME =
  /pix recebido|transferencia recebida|voce recebeu|recebimento de pix|deposito recebido/;
const NOT_RECEIPT = /agendad|cancelad|nao realizad|devolvid/;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Cabeçalhos de seção, sozinhos na linha (normalizados). */
const RECEIVER_HEADER =
  /^(destino|para|quem recebeu|recebedor|favorecido|dados do recebedor|beneficiario)$/;
const PAYER_HEADER = /^(origem|de|quem pagou|pagador|dados do pagador|remetente)$/;
/** Cabeçalho com o nome na mesma linha: "nome do recebedor: LOJA". */
const RECEIVER_INLINE = /^(?:nome do recebedor|recebedor|favorecido|beneficiario)\s*:\s*(.+)$/i;
const PAYER_INLINE = /^(?:nome do pagador|pagador|remetente)\s*:\s*(.+)$/i;

const NAME_LABEL = /^nome\b\s*:?\s*(.*)$/i;
const INSTITUTION_LABEL = /^institui[cç][aã]o\b\s*:?\s*(.*)$/i;
/** Linhas de dado que não são nome nem banco (documentos, conta, chave…). */
const OTHER_LABEL =
  /^(cpf|cnpj|ag[eê]ncia|conta|tipo de conta|chave|id da transa|autentica|c[oó]digo|data|hora|hor[aá]rio|valor|tipo de transfer)/i;

type Section = { name: string | null; institution: string | null };

function readDate(full: string, receivedAtMs: number): { date: string; found: boolean } {
  const numeric = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(full);
  if (numeric) {
    const date = formatISODate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
    if (isISODate(date)) return { date, found: true };
  }
  const named = /(\d{1,2})\s+(?:de\s+)?([a-zç]{3})[a-zç]*\.?\s+(?:de\s+)?(\d{4})/i.exec(
    normalize(full),
  );
  if (named) {
    const month = MONTHS.indexOf(named[2].slice(0, 3)) + 1;
    const date = formatISODate(Number(named[3]), month, Number(named[1]));
    if (month > 0 && isISODate(date)) return { date, found: true };
  }
  return { date: toISODate(new Date(receivedAtMs)), found: false };
}

/** `20.00` (OCR) vira `20,00`; milhar com ponto (`1.234,56`) fica como está. */
const amountText = (raw: string) => raw.replace(/\s/g, '').replace(/^(\d+)\.(\d{2})$/, '$1,$2');

function readAmount(lines: string[]): number | null {
  // Preferir o valor junto do rótulo "Valor" (mesma linha ou a seguinte).
  for (let i = 0; i < lines.length; i++) {
    if (!VALUE_LABEL.test(normalize(lines[i]))) continue;
    const match = AMOUNT.exec(lines[i]) ?? AMOUNT.exec(lines[i + 1] ?? '');
    if (match) return parseBRL(amountText(match[1]));
  }
  for (const line of lines) {
    const match = AMOUNT.exec(line);
    if (match) return parseBRL(amountText(match[1]));
  }
  return null;
}

type Field = 'name' | 'institution' | 'other';

/** Rótulo da linha e o valor na mesma linha (vazio se o valor vem depois). */
function labelOf(line: string): { field: Field; rest: string } | null {
  const name = NAME_LABEL.exec(line);
  if (name) return { field: 'name', rest: name[1].trim() };
  const institution = INSTITUTION_LABEL.exec(line);
  if (institution) return { field: 'institution', rest: institution[1].trim() };
  if (OTHER_LABEL.test(line)) {
    const rest = line
      .replace(OTHER_LABEL, '')
      .replace(/^[^:]*:/, '')
      .trim();
    // "CPF •••.000.000-••": o resto é o próprio valor; "ID da transação" sozinho: vem depois.
    return { field: 'other', rest: /[\d•*]/.test(rest) ? rest : '' };
  }
  return null;
}

/** CPF/CNPJ (mascarado ou não), chave, ID: nunca é nome nem banco. */
const looksLikeDocument = (line: string) =>
  /[•*]{2,}|\d{3}\.\d{3}|\d{2}\.\d{3}\.\d{3}|^[A-Z]?\d[\dA-Za-z]{10,}$/.test(line);

/**
 * Nome e banco de uma seção (linhas entre o cabeçalho e o próximo cabeçalho).
 *
 * Os rótulos sem valor na linha entram numa fila e recebem as próximas linhas de valor, na
 * ordem. Assim funciona tanto rótulo/valor alternados quanto o OCR que lê em colunas
 * ("Nome", "CPF", "Instituição" e depois os três valores).
 */
function readSection(lines: string[], inlineName: string | null): Section {
  let name = inlineName;
  let institution: string | null = null;
  const pending: Field[] = [];
  const loose: string[] = [];
  const assign = (field: Field, value: string) => {
    if (field === 'name') name ??= value;
    else if (field === 'institution') institution ??= value;
  };
  for (const line of lines) {
    const label = labelOf(line);
    if (label) {
      if (label.rest) assign(label.field, label.rest);
      else pending.push(label.field);
      continue;
    }
    if (pending.length === 0) {
      loose.push(line);
      continue;
    }
    // Documento vai para o rótulo de documento da fila, mesmo fora de ordem.
    const otherAt = pending.indexOf('other');
    const field =
      looksLikeDocument(line) && otherAt >= 0 ? pending.splice(otherAt, 1)[0] : pending.shift()!;
    if (field === 'other' || !looksLikeDocument(line)) assign(field, line);
  }
  // Sem rótulos (ex.: Mercado Pago): primeira linha é o nome, a seguinte é o banco.
  const free = loose.filter((l) => !looksLikeDocument(l));
  name ??= free[0] ?? null;
  institution ??= (inlineName ? free[0] : free[1]) ?? null;
  return { name, institution };
}

type Bounds = { start: number; inline: string | null };

/** Seção em que o OCR só deixou rótulos ("Nome", "CPF"…): os valores ficaram em outro bloco. */
const onlyLabels = (lines: readonly string[]) =>
  lines.length > 0 && lines.every((line) => labelOf(line)?.rest === '');

/** Linhas que não são nome de pessoa nem banco: rodapé, ajuda, títulos. */
const BOILERPLATE =
  /ajuda|ouvidoria|estamos|duvida|atendimento|comprovante|transferencia|^pix$|^ted$|^doc$|canais|uteis/;
/** Banco ou instituição de pagamento (e não a frase do rodapé "Instituição de Pagamento"). */
const BANK_LINE = /\b(banco|bank|pagamentos|financeira|cooperativa|caixa|sicoob|sicredi|ip)\b/;

const isBankLine = (line: string) => {
  const norm = normalize(line);
  return BANK_LINE.test(norm) && !/institui/.test(norm) && !looksLikeDocument(line);
};

/** Nome de pessoa ou empresa: só letras, duas palavras ou mais. */
const isNameLine = (line: string) => {
  const norm = normalize(line);
  return (
    /^[a-z'.]+(?: [a-z'.&-]+)+$/.test(norm) &&
    !BOILERPLATE.test(norm) &&
    !isBankLine(line) &&
    !labelOf(line)
  );
};

/**
 * OCR em colunas (ML Kit): todos os rótulos primeiro e, depois, os valores misturados ao
 * rodapé. Os valores ficam na ordem visual, então o 1º nome e o 1º banco são da seção que
 * aparece primeiro (normalmente Destino) e os 2º, da seguinte.
 */
function readColumns(lines: string[], receiverFirst: boolean) {
  const lastLabel = lines.reduce(
    (last, line, i) =>
      labelOf(line)?.rest === '' ||
      RECEIVER_HEADER.test(normalize(line)) ||
      PAYER_HEADER.test(normalize(line))
        ? i
        : last,
    -1,
  );
  const values = lines.slice(lastLabel + 1);
  const names = values.filter(isNameLine);
  const banks = values.filter(isBankLine);
  const [first, second] = [0, 1].map((i) => ({
    name: names[i] ?? null,
    institution: banks[i] ?? null,
  }));
  return receiverFirst ? { receiver: first, payer: second } : { receiver: second, payer: first };
}

function findSections(lines: string[]) {
  const receivers: Bounds[] = [];
  const payers: Bounds[] = [];
  const headers: number[] = [];
  lines.forEach((line, i) => {
    const norm = normalize(line);
    const receiverInline = RECEIVER_INLINE.exec(line);
    const payerInline = PAYER_INLINE.exec(line);
    if (RECEIVER_HEADER.test(norm) || receiverInline) {
      receivers.push({ start: i, inline: receiverInline?.[1].trim() ?? null });
      headers.push(i);
    } else if (PAYER_HEADER.test(norm) || payerInline) {
      payers.push({ start: i, inline: payerInline?.[1].trim() ?? null });
      headers.push(i);
    }
  });
  const sectionLines = (b: Bounds) =>
    lines.slice(b.start + 1, headers.find((h) => h > b.start) ?? lines.length);
  const slice = (b: Bounds | undefined): Section | null =>
    b ? readSection(sectionLines(b), b.inline) : null;

  const [receiver, payer] = [receivers[0], payers[0]];
  const columns = [receiver, payer].some((b) => b && !b.inline && onlyLabels(sectionLines(b)));
  if (columns) {
    const receiverFirst = !payer || (!!receiver && receiver.start < payer.start);
    return readColumns(lines, receiverFirst);
  }
  return { receiver: slice(receiver), payer: slice(payer) };
}

/** Comprovante numa frase só ("Pix de R$ 42,00 enviado para FULANO em …"). */
function readSentence(full: string): Section & { counterpartIncome: string | null } {
  const to = /\bpara\s+([^.,;\n]+?)(?:\s+(?:em|no dia|às|as)\s+\d|[.,;\n]|$)/i.exec(full);
  const from = /\bde\s+([A-ZÀ-Ý][^.,;\n]+?)(?:\s+(?:em|no dia|às|as)\s+\d|[.,;\n]|$)/.exec(full);
  const institution = /institui[cç][aã]o(?: de origem| de destino)?\s*:\s*([^.\n]+)/i.exec(full);
  return {
    name: to?.[1].trim() ?? null,
    counterpartIncome: from?.[1].trim() ?? null,
    institution: institution?.[1].trim() ?? null,
  };
}

const MAX_NAME = 60;

export function parseReceipt(text: string, receivedAtMs: number): ParsedReceipt | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const full = lines.join('\n');
  const norm = normalize(full);
  if (NOT_RECEIPT.test(norm)) return null;

  const amountCents = readAmount(lines);
  if (!amountCents || amountCents <= 0) return null;
  const kind = INCOME.test(norm) ? 'income' : 'expense';
  const { date, found: dateFound } = readDate(full, receivedAtMs);

  const { receiver, payer } = findSections(lines);
  let counterpart: string | null;
  let institution: string | null;
  if (receiver || payer) {
    counterpart = (kind === 'expense' ? receiver?.name : payer?.name) ?? null;
    institution = (kind === 'expense' ? payer?.institution : receiver?.institution) ?? null;
  } else {
    const sentence = readSentence(full);
    counterpart = kind === 'expense' ? sentence.name : sentence.counterpartIncome;
    institution = sentence.institution;
  }

  let confidence = 0.5;
  if (counterpart) confidence += 0.15;
  if (institution) confidence += 0.15;
  if (dateFound) confidence += 0.1;

  return {
    amountCents,
    kind,
    counterpart: counterpart?.slice(0, MAX_NAME) ?? null,
    date,
    institution: institution?.slice(0, MAX_NAME) ?? null,
    confidence: Math.min(1, confidence),
  };
}
