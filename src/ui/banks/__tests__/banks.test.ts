import { bankLogoXml } from '../logos.generated';
import { bankIcon, banks, matchBank, resolveBank } from '../banks';

describe('catálogo de bancos', () => {
  it('tem 20 bancos, todos com logo e sem ids repetidos', () => {
    expect(banks).toHaveLength(20);
    expect(new Set(banks.map((b) => b.id)).size).toBe(20);
    for (const bank of banks) {
      expect(bankLogoXml[bank.id]).toMatch(/^<svg/);
      expect(bank.background).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('logos monocromáticos usam currentColor (sem cores fixas)', () => {
    for (const id of ['nubank', 'santander', 'inter', 'c6'] as const) {
      expect(bankLogoXml[id]).toContain('currentColor');
      expect(bankLogoXml[id]).not.toMatch(/fill="#/);
    }
  });
});

describe('matchBank', () => {
  it.each([
    ['Nubank', 'nubank'],
    ['nu pagamentos s.a', 'nubank'],
    ['Banco Inter', 'inter'],
    ['Banco Inter S.A.', 'inter'],
    ['Itaú', 'itau'],
    ['ITAU UNIBANCO', 'itau'],
    ['Banco do Brasil', 'bb'],
    ['Caixa Econômica Federal', 'caixa'],
    ['PagSeguro', 'pagbank'],
    ['Mercado Pago', 'mercadopago'],
    ['C6 Bank', 'c6'],
    ['XP Investimentos', 'xp'],
    ['Banco Pan', 'pan'],
  ])('%p → %s', (name, id) => {
    expect(matchBank(name)?.id).toBe(id);
  });

  it.each(['Carteira', 'Dinheiro', 'Cooperativa Local', '', 'Banco'])('%p → nenhum', (name) => {
    expect(matchBank(name)).toBeUndefined();
  });
});

describe('resolveBank', () => {
  it('o banco escolhido no ícone vale mais que o nome', () => {
    expect(resolveBank('Minha conta', bankIcon('safra'))?.id).toBe('safra');
  });

  it('sem banco no ícone, reconhece pelo nome; iniciais continuam como estão', () => {
    expect(resolveBank('Nubank', 'NU')?.id).toBe('nubank');
    expect(resolveBank('Dinheiro', 'DI')).toBeUndefined();
  });
});
