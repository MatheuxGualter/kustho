/**
 * Catálogo dos bancos com logo oficial. As cores são as das marcas (dados, não tokens do
 * tema), por isso este arquivo fica fora da regra de lint de hex soltos.
 */
import { normalizeSearch } from '@/domain/transactions/rules';

import { type BankId, bankLogoXml } from './logos.generated';

export type { BankId };

export type Bank = {
  id: BankId;
  /** Nome exibido e gravado como instituição. */
  name: string;
  /** Fundo do círculo. */
  background: string;
  /** Cor do logo quando ele é monocromático (`currentColor`). */
  foreground: string;
  /**
   * `icon`: o SVG já é o ícone completo (com fundo) e cobre o círculo.
   * `mark`: o logo vai centralizado sobre `background`, ocupando `scale` do diâmetro.
   */
  style: 'icon' | 'mark';
  scale: number;
  /** Outros nomes que identificam o banco (comparados sem acentos e sem "banco"). */
  aliases: string[];
};

const WHITE = '#FFFFFF';

const mark = (
  id: BankId,
  name: string,
  background: string,
  aliases: string[],
  scale = 0.6,
  foreground = WHITE,
): Bank => ({ id, name, background, foreground, style: 'mark', scale, aliases });

const icon = (id: BankId, name: string, background: string, aliases: string[]): Bank => ({
  id,
  name,
  background,
  foreground: WHITE,
  style: 'icon',
  scale: 1,
  aliases,
});

/** Os 20 bancos mais usados, na ordem em que aparecem no seletor. */
export const banks: readonly Bank[] = [
  mark('nubank', 'Nubank', '#820AD1', ['nu', 'nu pagamentos', 'nu bank'], 0.62),
  icon('itau', 'Itaú', '#EC7000', ['itau unibanco', 'unibanco']),
  mark('bb', 'Banco do Brasil', '#FCDB00', ['bb', 'brasil'], 0.66),
  mark('caixa', 'Caixa', WHITE, ['caixa economica', 'caixa economica federal', 'cef'], 0.62),
  // O símbolo é vazado: o fundo branco aparece como a árvore branca do logo oficial.
  icon('bradesco', 'Bradesco', WHITE, ['next']),
  mark('santander', 'Santander', '#EC0000', [], 0.56),
  mark('inter', 'Inter', '#FF7A00', ['banco inter'], 0.56),
  mark('c6', 'C6 Bank', '#242424', ['c6'], 0.6),
  mark('mercadopago', 'Mercado Pago', WHITE, ['mercadopago'], 0.72),
  mark('picpay', 'PicPay', '#21C25E', ['pic pay'], 0.6),
  mark('pagbank', 'PagBank', WHITE, ['pagseguro', 'pag seguro', 'pag bank'], 0.72),
  mark('btg', 'BTG Pactual', '#0B2341', ['btg'], 0.66),
  mark('xp', 'XP', '#000000', ['xp investimentos', 'xp inc'], 0.66),
  mark('neon', 'Neon', '#00A1E4', [], 0.7),
  mark('sicoob', 'Sicoob', '#003641', [], 0.62),
  mark('sicredi', 'Sicredi', WHITE, [], 0.66),
  icon('pan', 'Banco Pan', '#00AFFF', ['pan']),
  mark('original', 'Original', '#00A857', ['banco original'], 0.56),
  mark('safra', 'Safra', '#0F2A4A', ['banco safra'], 0.56),
  mark('banrisul', 'Banrisul', WHITE, [], 0.66),
];

const byId = new Map(banks.map((b) => [b.id, b]));

/** Normaliza para comparar: sem acentos, minúsculas, sem "banco"/"s.a" e pontuação. */
function normalizeInstitution(text: string): string {
  return normalizeSearch(text)
    .replace(/[.,\-_/]/g, ' ')
    .replace(/\b(banco|bank|s\s?a|sa)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const lookup = new Map<string, Bank>();
for (const bank of banks) {
  for (const name of [bank.id, bank.name, ...bank.aliases]) {
    const key = normalizeInstitution(name);
    if (key && !lookup.has(key)) lookup.set(key, bank);
  }
}

export function getBank(id: string): Bank | undefined {
  return byId.get(id as BankId);
}

/** Banco a partir do nome digitado da instituição ("Banco Inter", "nubank", "Itaú"). */
export function matchBank(institution: string): Bank | undefined {
  const key = normalizeInstitution(institution);
  return key ? lookup.get(key) : undefined;
}

/** Prefixo gravado no campo `icon` da conta quando o usuário escolhe um banco do catálogo. */
export const BANK_ICON_PREFIX = 'bank:';

export const bankIcon = (id: BankId) => `${BANK_ICON_PREFIX}${id}`;

/** Banco de uma conta/cartão: o escolhido no ícone ou o reconhecido pelo nome. */
export function resolveBank(institution: string, icon?: string | null): Bank | undefined {
  if (icon?.startsWith(BANK_ICON_PREFIX)) return getBank(icon.slice(BANK_ICON_PREFIX.length));
  return matchBank(institution);
}

/** O SVG do logo de um banco. */
export const bankLogo = (id: BankId) => bankLogoXml[id];
