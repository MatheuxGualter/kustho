import { createFakeNotificationCapture } from '../fake';

const NUBANK = 'com.nu.production';

describe('createFakeNotificationCapture', () => {
  it('grava só pacotes permitidos', async () => {
    const capture = createFakeNotificationCapture({ allowedPackages: [NUBANK] });

    expect(capture.post({ packageName: 'com.whatsapp', text: 'oi' })).toBeNull();
    expect(capture.post({ packageName: NUBANK, text: 'Compra de R$ 12,90' })).not.toBeNull();

    expect(await capture.getPending(10)).toHaveLength(1);
  });

  it('mesma key com o mesmo conteúdo não grava de novo; conteúdo novo grava', async () => {
    const capture = createFakeNotificationCapture({ allowedPackages: [NUBANK] });

    capture.post({ packageName: NUBANK, key: 'k1', text: 'Compra de R$ 12,90' });
    capture.post({ packageName: NUBANK, key: 'k1', text: 'Compra de R$ 12,90' });
    capture.post({ packageName: NUBANK, key: 'k1', text: 'Compra de R$ 40,00' });

    const pending = await capture.getPending(10);
    expect(pending.map((n) => n.text)).toEqual(['Compra de R$ 12,90', 'Compra de R$ 40,00']);
  });

  it('getPending respeita o limite e markProcessed tira da fila', async () => {
    const capture = createFakeNotificationCapture({ allowedPackages: [NUBANK] });
    capture.post({ packageName: NUBANK, text: 'a' });
    capture.post({ packageName: NUBANK, text: 'b' });
    capture.post({ packageName: NUBANK, text: 'c' });

    const firstTwo = await capture.getPending(2);
    expect(firstTwo.map((n) => n.text)).toEqual(['a', 'b']);

    await capture.markProcessed(firstTwo.map((n) => n.id));
    expect((await capture.getPending(10)).map((n) => n.text)).toEqual(['c']);
  });

  it('avisa os ouvintes de onCaptured até remover a inscrição', () => {
    const capture = createFakeNotificationCapture({ allowedPackages: [NUBANK] });
    const received: string[] = [];
    const subscription = capture.addListener('onCaptured', (n) => received.push(n.text ?? ''));

    capture.post({ packageName: NUBANK, text: 'a' });
    subscription.remove();
    capture.post({ packageName: NUBANK, text: 'b' });

    expect(received).toEqual(['a']);
  });

  it('setAllowedPackages substitui a lista', () => {
    const capture = createFakeNotificationCapture({ allowedPackages: [NUBANK] });
    capture.setAllowedPackages(['com.itau']);

    expect(capture.getAllowedPackages()).toEqual(['com.itau']);
    expect(capture.post({ packageName: NUBANK, text: 'a' })).toBeNull();
  });
});
