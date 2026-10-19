import type { Account } from '@/domain/types';

import { bankInText, buildReceiptCapture, RECEIPT_SOURCE, receiptRawId } from '../capture';

const account = (fields: Partial<Account>): Account =>
  ({
    id: 'acc',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    name: 'Conta',
    type: 'checking',
    institution: 'Nubank',
    color: '#820AD1',
    icon: 'bank:nubank',
    initialBalanceCents: 0,
    archivedAt: null,
    ...fields,
  }) as Account;

const RECEIVED = new Date(2026, 9, 18, 15, 0).getTime();
const NUBANK_PIX =
  'Comprovante de transferência\n18 OUT 2026\nValor\nR$ 50,00\nDestino\nNome\nFULANO DE TAL\nInstituição\nBANCO INTER S.A.\nOrigem\nNome\nCICLANO\nInstituição\nNU PAGAMENTOS - IP';

describe('bankInText', () => {
  it.each([
    ['NU PAGAMENTOS - IP', 'nubank'],
    ['ITAÚ UNIBANCO S.A.', 'itau'],
    ['Banco Inter S.A.', 'inter'],
    ['BANCO DO BRASIL', 'bb'],
    ['Mercado Pago', 'mercadopago'],
    ['Cooperativa Desconhecida', undefined],
  ])('%s → %s', (text, id) => {
    expect(bankInText(text)?.id).toBe(id);
  });
});

describe('buildReceiptCapture', () => {
  it('Pix enviado vira saída na conta do banco de origem', () => {
    const nubank = account({ id: 'acc-nu', institution: 'Nubank', icon: 'bank:nubank' });
    const inter = account({ id: 'acc-inter', institution: 'Banco Inter', icon: 'bank:inter' });
    const fields = buildReceiptCapture(NUBANK_PIX, RECEIVED, [inter, nubank]);
    expect(fields).toMatchObject({
      channel: 'receipt',
      packageName: RECEIPT_SOURCE,
      parser: 'receipt',
      amountCents: 5000,
      kind: 'expense',
      merchant: 'FULANO DE TAL',
      date: '2026-10-18',
      suggestedAccountId: 'acc-nu',
      status: 'pending',
    });
  });

  it('sem conta do banco, fica sem origem', () => {
    expect(buildReceiptCapture(NUBANK_PIX, RECEIVED, [])?.suggestedAccountId).toBeNull();
  });

  it('conta arquivada não é sugerida', () => {
    const archived = account({ archivedAt: '2026-01-01' });
    expect(buildReceiptCapture(NUBANK_PIX, RECEIVED, [archived])?.suggestedAccountId).toBeNull();
  });

  it('texto que não é comprovante: null', () => {
    expect(buildReceiptCapture('bom dia!', RECEIVED, [])).toBeNull();
  });

  it('o mesmo comprovante compartilhado duas vezes tem o mesmo rawId', () => {
    expect(receiptRawId(NUBANK_PIX)).toBe(receiptRawId(`  ${NUBANK_PIX}\n`));
    expect(receiptRawId(NUBANK_PIX)).not.toBe(receiptRawId(NUBANK_PIX.replace('50,00', '51,00')));
  });
});
