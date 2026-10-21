import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { SharePayload } from 'expo-sharing';
import { Share } from 'react-native';

import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { ReceiptShareScreen } from '../ReceiptShareScreen';
import { ReceiptReaderProvider } from '../useReceiptReader';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { replace: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
}));

let mockShared: SharePayload[] = [];
const mockClear = jest.fn();
jest.mock('expo-sharing', () => ({
  useIncomingShare: () => ({
    sharedPayloads: mockShared,
    resolvedSharedPayloads: [],
    isResolving: false,
    clearSharedPayloads: mockClear,
    error: null,
    refreshSharePayloads: jest.fn(),
  }),
}));

const RECEIPT =
  'Comprovante de transferência\nValor\nR$ 50,00\nData 17/10/2026\nDestino\nNome\nFULANO DE TAL\nOrigem\nInstituição\nNU PAGAMENTOS - IP';

const render = async (
  reader: { recognizeText: jest.Mock } | null = null,
  prepare: (store: ReturnType<typeof createFakeStore>) => void = () => {},
) => {
  const store = createFakeStore();
  prepare(store);
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <ReceiptReaderProvider reader={reader}>
        <ReceiptShareScreen />
      </ReceiptReaderProvider>
    </ServicesProvider>,
  );
  return store;
};

beforeEach(() => jest.clearAllMocks());

it('texto compartilhado vira captura e abre a confirmação', async () => {
  mockShared = [{ value: RECEIPT, shareType: 'text', mimeType: 'text/plain' }];
  const store = await render();
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  const capture = store.captures.find((c) => c.channel === 'receipt')!;
  expect(capture).toMatchObject({ amountCents: 5000, kind: 'expense', merchant: 'FULANO DE TAL' });
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/pendente/[id]',
    params: { id: capture.id },
  });
  expect(mockClear).toHaveBeenCalled();
});

it('imagem passa pelo OCR no aparelho', async () => {
  mockShared = [{ value: 'content://banco/1', shareType: 'image', mimeType: 'image/png' }];
  const reader = { recognizeText: jest.fn(async () => RECEIPT) };
  const store = await render(reader);
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  expect(reader.recognizeText).toHaveBeenCalledWith('content://banco/1', 'image/png');
  expect(store.captures.some((c) => c.channel === 'receipt')).toBe(true);
});

it('imagem sem o módulo de OCR explica que precisa atualizar o app', async () => {
  mockShared = [{ value: 'content://banco/1', shareType: 'image', mimeType: 'image/png' }];
  await render(null);
  expect(await screen.findByText(/precisa ser atualizado/)).toBeTruthy();
});

it('conteúdo que não é comprovante mostra o erro e as saídas', async () => {
  mockShared = [{ value: 'bom dia!', shareType: 'text' }];
  await render();
  expect(await screen.findByText(/Não reconheci um comprovante/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Lançar à mão' })).toBeTruthy();
});

it('aberto sem nada compartilhado, ensina como usar', async () => {
  mockShared = [];
  await render();
  expect(screen.getByText('Nada para ler')).toBeTruthy();
});

it('Pix que já chegou e foi confirmado avisa em vez de abrir outra confirmação', async () => {
  mockShared = [{ value: RECEIPT, shareType: 'text', mimeType: 'text/plain' }];
  await render(null, (store) => {
    store.captures.push({
      ...store.captures[0],
      id: 'notificado',
      rawId: 'notificado',
      packageName: 'com.nu.production',
      channel: 'notification',
      status: 'confirmed',
      kind: 'expense',
      amountCents: 5000,
      postedAt: new Date().toISOString(),
      duplicateOfId: null,
    });
  });
  expect(await screen.findByText('Já está no Kustho')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
});

it('OCR que não vira comprovante oferece enviar o texto lido', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  mockShared = [{ value: 'content://banco/1', shareType: 'image', mimeType: 'image/png' }];
  const reader = { recognizeText: jest.fn(async () => 'Banner de propaganda sem valor') };
  await render(reader);
  expect(await screen.findByText(/Não reconheci um comprovante/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar o texto lido' }));
  expect(share).toHaveBeenCalledWith({ message: 'Banner de propaganda sem valor' });
});

it('imagem sem texto nenhum explica em vez de dizer que não é comprovante', async () => {
  mockShared = [{ value: 'content://banco/1', shareType: 'image', mimeType: 'image/png' }];
  await render({ recognizeText: jest.fn(async () => '  ') });
  expect(await screen.findByText(/Não encontrei texto nessa imagem/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Enviar o texto lido' })).toBeNull();
});

it('erro do OCR (não de regra) mostra o detalhe técnico', async () => {
  mockShared = [{ value: 'content://banco/1', shareType: 'image', mimeType: 'image/png' }];
  const reader = {
    recognizeText: jest.fn(async () => {
      throw new Error('MlKitException: Failed to init');
    }),
  };
  await render(reader);
  expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeTruthy();
  expect(screen.getByText('Detalhe técnico: Error: MlKitException: Failed to init')).toBeTruthy();
});
