/**
 * Parser genérico de reserva: tentado depois dos parsers de cada banco. Reconhece o formato
 * mais comum ("Compra de R$ 45,90 em LOJA", "Você recebeu um Pix de R$ 150,00 de FULANO") e
 * prefere não interpretar a errar: na dúvida devolve `null` ("não interpretada").
 */
import type { NotificationParser } from '@/domain/contracts';
import type { CaptureKind } from '@/domain/types';
import { toISODate } from '@/lib/dates';
import { parseBRL } from '@/lib/money';

/** Avisos que citam valor mas não são uma transação feita (ou que ainda não tratamos). */
const NOT_A_TRANSACTION =
  /nao aprovad|recusad|negad|cancelad|estorn|fatura|limite|codigo|senha|token|agendad|programad|vence|lembrete|cashback|rendimento|rendeu|investiment|emprestimo|oferta/;

/** Ordem importa: "crédito em conta" é entrada; "débito" vence "compra". */
const KIND_RULES: [RegExp, CaptureKind][] = [
  [/recebid|recebeu|recebimento|deposit|caiu na|credito em conta|creditad/, 'income'],
  [/debito/, 'expense'],
  [/compra|cartao|credito/, 'card_purchase'],
  [/enviad|enviou|pagou|pagamento|transferiu|transferencia realizada|saque|sacou/, 'expense'],
];

/** "R$ 1.234,56", "R$ 45,90" ou, sem centavos, "R$ 10" (Mercado Pago). */
const AMOUNT = /R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+,\d{2}|\d+)(?![\d,.]\d)/i;
const CARD_DIGITS = /(?:final|terminad[oa] em|\*{2,}|x{2,})\s*(\d{4})\b/;
/** Onde o nome do estabelecimento ou da pessoa termina. */
const NAME_END =
  /\s+(?:para o|para a|para seu|para sua|no cart|com o cart|com cart|foi|as \d|às \d|em \d|cart[aã]o final)|[.,;!\n]/i;

const MAX_NAME = 60;

export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Nome depois de "em", "para" ou "de", a partir do valor. Tenta cada ocorrência: em
 * "R$ 80,69 em 1x no crédito ... APROVADO em iFood" o primeiro "em" é das parcelas.
 */
function extractName(afterAmount: string, kind: CaptureKind): string | null {
  const prepositions = kind === 'income' ? ['de'] : ['em', 'para'];
  for (const prep of prepositions) {
    for (const match of afterAmount.matchAll(new RegExp(`\\b${prep}\\s+(?=(.+))`, 'gi'))) {
      const name = match[1].split(NAME_END)[0].replace(/\s+/g, ' ').trim();
      if (!name || /^(\d|r\$|sua |seu )/i.test(name)) continue;
      return name.slice(0, MAX_NAME);
    }
  }
  return null;
}

export const genericParser: NotificationParser = {
  id: 'generic',
  packages: [],
  parse(notification) {
    const full = [notification.title, notification.text].filter(Boolean).join('\n');
    const norm = normalize(full);
    if (NOT_A_TRANSACTION.test(norm)) return null;

    const amount = AMOUNT.exec(full);
    const amountCents = amount ? parseBRL(amount[1]) : null;
    if (!amount || !amountCents || amountCents <= 0) return null;

    const kind = KIND_RULES.find(([pattern]) => pattern.test(norm))?.[1];
    if (!kind) return null;

    const afterAmount = full.slice(amount.index + amount[0].length);
    const merchant = extractName(afterAmount, kind);
    const cardLastDigits = CARD_DIGITS.exec(norm)?.[1] ?? null;

    let confidence = 0.6;
    if (merchant) confidence += 0.1;
    if (kind === 'card_purchase' && cardLastDigits) confidence += 0.1;

    return {
      amountCents,
      kind,
      merchant,
      // O texto raramente traz a data; a notificação chega na hora da transação.
      date: toISODate(new Date(notification.postedAtMs)),
      cardLastDigits,
      confidence,
    };
  },
};
