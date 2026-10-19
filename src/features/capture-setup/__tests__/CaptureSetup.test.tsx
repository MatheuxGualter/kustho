import { fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { createFakeNotificationCapture } from '../../../../modules/notification-capture/src/fake';
import { bankApps } from '@/domain/captures/bankApps';
import { usePreferences } from '@/lib/preferences';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';
import { getBank } from '@/ui/banks/banks';

import { CaptureDiagnosticsScreen } from '../CaptureDiagnosticsScreen';
import { CaptureSetupScreen } from '../CaptureSetupScreen';
import { HomeCaptureNotice } from '../HomeCaptureNotice';
import { CaptureModuleProvider } from '../useCaptureDevice';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
}));

const render = async (
  ui: React.ReactElement,
  module = createFakeNotificationCapture(),
  store = createFakeStore(),
) => {
  const services = createFakeServices(store, module);
  await renderWithTheme(
    <ServicesProvider services={services}>
      <CaptureModuleProvider module={module}>{ui}</CaptureModuleProvider>
    </ServicesProvider>,
  );
  return { module, services };
};

beforeEach(() => {
  usePreferences.setState({ captureSetupDone: false, captureInviteDismissed: false });
});

describe('CaptureSetupScreen', () => {
  it('sugere os bancos das contas e salva os escolhidos', async () => {
    const { module } = await render(<CaptureSetupScreen />);
    // Os dados de exemplo têm conta no Nubank.
    const nubank = await screen.findByRole('checkbox', { name: 'Nubank' });
    expect(nubank.props.accessibilityState).toMatchObject({ checked: true });
    const suggested = screen
      .getAllByRole('checkbox')
      .filter((box) => box.props.accessibilityState?.checked)
      .map(
        (box) =>
          bankApps.find((app) => getBank(app.bankId)?.name === box.props.accessibilityLabel)!
            .packageName,
      );

    await fireEvent.press(screen.getByRole('checkbox', { name: 'PicPay' }));
    await fireEvent.changeText(
      screen.getByLabelText('Outros apps (pacote Android)'),
      'com.outro.banco, lixo',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar bancos' }));

    expect(module.getAllowedPackages().sort()).toEqual(
      [...suggested, 'com.picpay', 'com.outro.banco'].sort(),
    );
  });

  it('mostra o passo de configurações restritas enquanto o acesso não foi liberado', async () => {
    await render(<CaptureSetupScreen />);
    expect(await screen.findByText('A opção está cinza ou bloqueada?')).toBeTruthy();
  });

  it('com acesso e bancos, marca a configuração como feita', async () => {
    const module = createFakeNotificationCapture({ allowedPackages: ['com.nu.production'] });
    module.permissionGranted = true;
    await render(<CaptureSetupScreen />, module);
    expect(await screen.findByText(/Tudo pronto/)).toBeTruthy();
    expect(usePreferences.getState().captureSetupDone).toBe(true);
    expect(screen.queryByText('A opção está cinza ou bloqueada?')).toBeNull();
  });

  it('sem o módulo nativo, explica que precisa recompilar', async () => {
    const services = createFakeServices();
    await renderWithTheme(
      <ServicesProvider services={services}>
        <CaptureModuleProvider module={null}>
          <CaptureSetupScreen />
        </CaptureModuleProvider>
      </ServicesProvider>,
    );
    expect(screen.getByText(/precisa do app Android atualizado/)).toBeTruthy();
  });
});

describe('HomeCaptureNotice', () => {
  it('convida quem nunca configurou e some ao dispensar', async () => {
    await render(<HomeCaptureNotice />);
    expect(screen.getByText('Lance sem digitar')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));
    expect(usePreferences.getState().captureInviteDismissed).toBe(true);
    expect(screen.queryByText('Lance sem digitar')).toBeNull();
  });

  it('avisa quando a leitura configurada parou', async () => {
    usePreferences.setState({ captureSetupDone: true });
    await render(<HomeCaptureNotice />);
    expect(screen.getByText('A leitura de notificações parou')).toBeTruthy();
  });

  it('não aparece com tudo funcionando', async () => {
    const module = createFakeNotificationCapture({ allowedPackages: ['com.nu.production'] });
    module.permissionGranted = true;
    module.ignoringBatteryOptimizations = true;
    usePreferences.setState({ captureSetupDone: true });
    await render(<HomeCaptureNotice />, module);
    expect(screen.queryByText('A leitura de notificações parou')).toBeNull();
    expect(screen.queryByText('Lance sem digitar')).toBeNull();
  });
});

describe('CaptureDiagnosticsScreen', () => {
  it('resume por app e exporta anonimizado', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<CaptureDiagnosticsScreen />);
    expect(await screen.findByText('Acesso às notificações desligado')).toBeTruthy();
    expect(await screen.findByText(/não interpretada/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Exportar anonimizado' }));
    expect(share).toHaveBeenCalledTimes(1);
    const { message } = share.mock.calls[0][0] as { message: string };
    const exported = JSON.parse(message) as { cases: unknown[] };
    expect(exported.cases.length).toBeGreaterThan(0);
    expect(message).not.toContain('PADARIA EXEMPLO');
  });

  it('buscar agora lê as notificações novas do módulo', async () => {
    const module = createFakeNotificationCapture({ allowedPackages: ['com.nu.production'] });
    const { services } = await render(<CaptureDiagnosticsScreen />, module);
    module.post({ packageName: 'com.nu.production', text: 'Compra de R$ 9,90' });
    const before = await services.captures.countPending();
    await fireEvent.press(await screen.findByRole('button', { name: 'Buscar notificações agora' }));
    expect(await services.captures.countPending()).toBe(before + 1);
  });

  it('precisão por fonte: liga o automático só na fonte liberada', async () => {
    const store = createFakeStore();
    const [sample] = store.captures;
    const confirmed = (packageName: string, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        ...sample,
        id: `${packageName}-${i}`,
        rawId: `${packageName}-${i}`,
        packageName,
        status: 'confirmed' as const,
      }));
    store.captures.push(...confirmed('com.nu.production', 20), ...confirmed('com.itau', 3));
    const { services } = await render(<CaptureDiagnosticsScreen />, undefined, store);

    expect(await screen.findByText('20 de 20 sem edição (100%)')).toBeTruthy();
    expect(screen.getByText('3 de 3 sem edição (100%)')).toBeTruthy();
    expect(screen.getByText('Ainda não liberado')).toBeTruthy();

    const nubank = getBank('nubank')!.name;
    await fireEvent(
      screen.getByLabelText(`Lançar automaticamente: ${nubank}`),
      'valueChange',
      true,
    );
    const stats = await services.captures.getSourceStats();
    expect(stats.find((s) => s.packageName === 'com.nu.production')?.autoConfirm).toBe(true);
    expect(stats.find((s) => s.packageName === 'com.itau')?.autoConfirm).toBe(false);
  });
});
