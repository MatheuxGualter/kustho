import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

import { isDomainError } from '@/domain/errors';

import { sharedReceiptFrom, sharedReceiptText } from '../sharedReceipt';

describe('sharedReceiptFrom', () => {
  it('texto compartilhado vai direto', () => {
    const payload: SharePayload = {
      value: 'Pix de R$ 1,00',
      shareType: 'text',
      mimeType: 'text/plain',
    };
    expect(sharedReceiptFrom([payload])).toEqual({ kind: 'text', text: 'Pix de R$ 1,00' });
  });

  it('imagem e PDF vão para o OCR com a URI resolvida', () => {
    const image: ResolvedSharePayload = {
      value: 'content://banco/1',
      shareType: 'image',
      mimeType: 'image/png',
      contentUri: 'file:///cache/comprovante.png',
      contentType: 'image',
      contentMimeType: 'image/png',
      originalName: 'comprovante.png',
      contentSize: 1000,
    };
    expect(sharedReceiptFrom([image])).toEqual({
      kind: 'file',
      uri: 'file:///cache/comprovante.png',
      mimeType: 'image/png',
    });
    const pdf: SharePayload = {
      value: 'content://banco/2',
      shareType: 'file',
      mimeType: 'application/pdf',
    };
    expect(sharedReceiptFrom([pdf])).toEqual({
      kind: 'file',
      uri: 'content://banco/2',
      mimeType: 'application/pdf',
    });
  });

  it('vídeo, texto vazio ou nada: null', () => {
    expect(
      sharedReceiptFrom([{ value: 'x', shareType: 'video', mimeType: 'video/mp4' }]),
    ).toBeNull();
    expect(sharedReceiptFrom([{ value: '  ', shareType: 'text' }])).toBeNull();
    expect(sharedReceiptFrom([])).toBeNull();
  });
});

describe('sharedReceiptText', () => {
  it('arquivo passa pelo OCR; sem o módulo, erro claro', async () => {
    const reader = { recognizeText: jest.fn(async () => 'Valor R$ 5,00') };
    await expect(
      sharedReceiptText({ kind: 'file', uri: 'file:///a.png', mimeType: 'image/png' }, reader),
    ).resolves.toBe('Valor R$ 5,00');
    expect(reader.recognizeText).toHaveBeenCalledWith('file:///a.png', 'image/png');

    const error = await sharedReceiptText(
      { kind: 'file', uri: 'file:///a.png', mimeType: 'image/png' },
      null,
    ).catch((e: unknown) => e);
    expect(isDomainError(error) && error.code).toBe('receipt_reader_unavailable');
  });
});
