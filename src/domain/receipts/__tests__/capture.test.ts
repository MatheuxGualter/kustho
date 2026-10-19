import type { Account } from '@/domain/types';

import {
  bankInText,
  buildReceiptCapture,
  pixEndToEndId,
  RECEIPT_SOURCE,
  receiptRawId,
} from '../capture';

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

  it('com o ID do Pix, o rawId é ele: imagem e PDF do mesmo comprovante batem', () => {
    // O OCR lê a imagem e o PDF com diferenças (quebras de linha, acentos, "1 de 1").
    const image =
      'itaū\nComprovante de Pix\nR$ 0,02\nDe\nCICLANO\nInstituiçäo: ITAÚ UNIBANCO S.A\nPara\nFULANO DE TAL\nInstituição: NU PAGAMENTOS S.A. - INSTITUIÇÃO DE\nPAGAMENTO\nID da transação:\nE60701190202610191815AB1234CD5EO';
    const pdf =
      'itaů\nComprovante de Pix\nR$ 0,02\nDe\nCICLANO\nInstituição: ITAÚ UNIBANCO S.A\nPara\nFULANO DE TAL\nInstituição: NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO\nID da transação: E60701190202610191815AB1234CD5E0\n1 de 1';
    expect(receiptRawId(image)).toBe('receipt:pix:E60701190202610191815AB1234CD5E0');
    expect(receiptRawId(pdf)).toBe(receiptRawId(image));
  });
});

describe('pixEndToEndId', () => {
  it('acha o ID (E + ISPB + data e hora + 11 caracteres) e troca O por 0', () => {
    expect(pixEndToEndId('ID da transação:\ne18236120202610181432s0123456789')).toBe(
      'E18236120202610181432S0123456789',
    );
    expect(pixEndToEndId('ID: E6O7O1190202610191815AB1234CD5EO')).toBe(
      'E60701190202610191815AB1234CD5E0',
    );
  });

  it('sem ID, ou com a autenticação no lugar: null', () => {
    expect(pixEndToEndId(NUBANK_PIX)).toBeNull();
    expect(pixEndToEndId('Autenticação: CE99E8D9CCB07F690C86B68EADFA3640BE4BE310')).toBeNull();
  });
});
