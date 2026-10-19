import type { Capture, MerchantRule } from '@/domain/types';

import {
  applyMerchantRule,
  confirmationEdited,
  learnedMerchantRule,
  merchantKey,
} from '../merchantRules';
import { captureExtrasDefaults } from '../rules';

const capture = (fields: Partial<Capture> = {}): Capture => ({
  id: 'c',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  rawId: 'r',
  packageName: 'com.nu.production',
  title: null,
  text: null,
  postedAt: '2026-10-18T15:00:00.000Z',
  parser: 'generic',
  amountCents: 3990,
  kind: 'card_purchase',
  merchant: 'IFOOD *Restaurante Bom',
  date: '2026-10-18',
  cardLastDigits: null,
  suggestedAccountId: null,
  suggestedCardId: null,
  confidence: 0.7,
  status: 'pending',
  transactionId: null,
  ...captureExtrasDefaults,
  ...fields,
});

const rule = (fields: Partial<MerchantRule>): MerchantRule => ({
  id: 'mr',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  merchantKey: 'ifood restaurante bom',
  categoryId: 'cat-food',
  accountId: null,
  cardId: 'card-nu',
  hits: 1,
  ...fields,
});

describe('merchantKey', () => {
  it.each([
    ['IFOOD *Restaurante Bom', 'ifood restaurante bom'],
    ['Padaria do Zé LTDA', 'padaria do ze'],
    ['  UBER   TRIP ', 'uber trip'],
    ['MERCADO EXEMPLO S.A.', 'mercado exemplo'],
    ['Loja 123 - Centro', 'loja centro'],
  ])('%s → %s', (merchant, key) => {
    expect(merchantKey(merchant)).toBe(key);
  });

  it('nome vazio ou só sufixo não vira chave', () => {
    expect(merchantKey('')).toBeNull();
    expect(merchantKey(null)).toBeNull();
    expect(merchantKey('LTDA')).toBeNull();
  });
});

describe('applyMerchantRule', () => {
  it('preenche a categoria e, sem origem, a origem da regra', () => {
    expect(applyMerchantRule(capture(), [rule({})])).toMatchObject({
      suggestedCategoryId: 'cat-food',
      suggestedCardId: 'card-nu',
    });
  });

  it('a origem que já veio da regra do app vale mais que a do estabelecimento', () => {
    const withOrigin = capture({ suggestedCardId: 'card-inter' });
    expect(applyMerchantRule(withOrigin, [rule({})])).toMatchObject({
      suggestedCategoryId: 'cat-food',
      suggestedCardId: 'card-inter',
    });
  });

  it('origem da regra incompatível com o tipo não entra (conta para compra no cartão)', () => {
    const accountRule = rule({ cardId: null, accountId: 'acc-nu' });
    expect(applyMerchantRule(capture(), [accountRule])).toMatchObject({
      suggestedAccountId: null,
      suggestedCardId: null,
    });
  });

  it('sem regra para o estabelecimento, nada muda', () => {
    const c = capture({ merchant: 'Outra Loja' });
    expect(applyMerchantRule(c, [rule({})])).toEqual(c);
  });
});

describe('learnedMerchantRule', () => {
  it('aprende categoria e origem da confirmação', () => {
    expect(
      learnedMerchantRule(capture(), {
        categoryId: 'cat-food',
        cardId: 'card-nu',
        accountId: null,
      }),
    ).toEqual({
      merchantKey: 'ifood restaurante bom',
      categoryId: 'cat-food',
      accountId: null,
      cardId: 'card-nu',
    });
  });

  it('sem estabelecimento, nada a aprender', () => {
    expect(learnedMerchantRule(capture({ merchant: null }), { categoryId: 'x' })).toBeNull();
  });
});

describe('confirmationEdited', () => {
  it('confirmar a sugestão como veio não conta como edição', () => {
    expect(confirmationEdited(capture({ suggestedCardId: 'card-nu' }), {})).toBe(false);
    expect(
      confirmationEdited(capture({ suggestedCardId: 'card-nu' }), {
        amountCents: 3990,
        cardId: 'card-nu',
      }),
    ).toBe(false);
  });

  it('mudar valor, tipo, origem, data ou descrição conta', () => {
    const c = capture({ suggestedCardId: 'card-nu', suggestedCategoryId: 'cat-food' });
    expect(confirmationEdited(c, { amountCents: 4000 })).toBe(true);
    expect(confirmationEdited(c, { cardId: 'card-inter' })).toBe(true);
    expect(confirmationEdited(c, { kind: 'expense' })).toBe(true);
    expect(confirmationEdited(c, { date: '2026-10-17' })).toBe(true);
    expect(confirmationEdited(c, { description: 'Almoço' })).toBe(true);
    expect(confirmationEdited(c, { categoryId: 'cat-other' })).toBe(true);
  });
});
