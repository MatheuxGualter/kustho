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

const AMOUNT = /R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+,\d{2}|\d+)(?![\d,.]\d)/i;
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

function readAmount(lines: string[]): number | null {
  // Preferir o valor junto do rótulo "Valor" (mesma linha ou a seguinte).
  for (let i = 0; i < lines.length; i++) {
    if (!VALUE_LABEL.test(normalize(lines[i]))) continue;
    const match = AMOUNT.exec(lines[i]) ?? AMOUNT.exec(lines[i + 1] ?? '');
    if (match) return parseBRL(match[1]);
  }
  for (const line of lines) {
    const match = AMOUNT.exec(line);
    if (match) return parseBRL(match[1]);
  }
  return null;
}

/** Valor de um rótulo: o resto da linha ou, se vazio, a linha seguinte. */
function labelValue(lines: string[], i: number, label: RegExp): string | null {
  const rest = label.exec(lines[i])?.[1]?.trim();
  if (rest) return rest;
  const next = lines[i + 1];
  return next && !OTHER_LABEL.test(next) ? next : null;
}

/** Nome e banco de uma seção (linhas entre o cabeçalho e o próximo cabeçalho). */
function readSection(lines: string[], inlineName: string | null): Section {
  let name = inlineName;
  let institution: string | null = null;
  const loose: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (NAME_LABEL.test(line)) {
      name ??= labelValue(lines, i, NAME_LABEL);
      if (!NAME_LABEL.exec(line)?.[1]) i++;
    } else if (INSTITUTION_LABEL.test(line)) {
      institution ??= labelValue(lines, i, INSTITUTION_LABEL);
      if (!INSTITUTION_LABEL.exec(line)?.[1]) i++;
    } else if (OTHER_LABEL.test(line)) {
      // Rótulo sozinho na linha ("CPF"): o valor vem na seguinte e também não interessa.
      const hasValue =
        line
          .replace(OTHER_LABEL, '')
          .replace(/^[^:]*:/, '')
          .trim() !== '';
      if (!hasValue) i++;
    } else {
      loose.push(line);
    }
  }
  // Sem rótulos (ex.: Mercado Pago): primeira linha é o nome, a seguinte é o banco.
  name ??= loose[0] ?? null;
  institution ??= (inlineName ? loose[0] : loose[1]) ?? null;
  return { name, institution };
}

type Bounds = { start: number; inline: string | null };

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
  const slice = (b: Bounds | undefined): Section | null => {
    if (!b) return null;
    const end = headers.find((h) => h > b.start) ?? lines.length;
    return readSection(lines.slice(b.start + 1, end), b.inline);
  };
  return { receiver: slice(receivers[0]), payer: slice(payers[0]) };
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
