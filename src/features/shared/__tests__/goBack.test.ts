import { router } from 'expo-router';

import { goBackOr } from '../goBack';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mocked = router as unknown as Record<'canGoBack' | 'back' | 'replace', jest.Mock>;

beforeEach(() => jest.clearAllMocks());

it('volta quando há tela anterior', () => {
  mocked.canGoBack.mockReturnValue(true);
  goBackOr('/pendentes');
  expect(mocked.back).toHaveBeenCalled();
  expect(mocked.replace).not.toHaveBeenCalled();
});

it('aberta direto (compartilhar), vai para o destino em vez de voltar', () => {
  mocked.canGoBack.mockReturnValue(false);
  goBackOr('/pendentes');
  expect(mocked.back).not.toHaveBeenCalled();
  expect(mocked.replace).toHaveBeenCalledWith('/pendentes');
});
