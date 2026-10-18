import { batteryBrand, captureHealth, homeCaptureNotice } from '../health';

const ready = {
  available: true,
  permissionGranted: true,
  ignoringBatteryOptimizations: true,
  allowedPackages: ['com.nu.production'],
};

describe('captureHealth', () => {
  it('vai do mais grave ao ok', () => {
    expect(captureHealth({ ...ready, available: false, permissionGranted: false })).toBe(
      'unavailable',
    );
    expect(captureHealth({ ...ready, permissionGranted: false, allowedPackages: [] })).toBe(
      'no_permission',
    );
    expect(captureHealth({ ...ready, allowedPackages: [] })).toBe('no_banks');
    expect(captureHealth({ ...ready, ignoringBatteryOptimizations: false })).toBe('battery');
    expect(captureHealth(ready)).toBe('ok');
  });
});

describe('homeCaptureNotice', () => {
  const fresh = { setupDone: false, inviteDismissed: false };

  it('convida quem nunca configurou, até dispensar', () => {
    expect(homeCaptureNotice('no_permission', fresh)).toBe('invite');
    expect(homeCaptureNotice('no_permission', { ...fresh, inviteDismissed: true })).toBeNull();
  });

  it('avisa quem configurou quando a captura para', () => {
    const done = { setupDone: true, inviteDismissed: true };
    expect(homeCaptureNotice('no_permission', done)).toBe('broken');
    expect(homeCaptureNotice('no_banks', done)).toBe('broken');
  });

  it('não incomoda com bateria, captura ok ou sem módulo', () => {
    for (const health of ['ok', 'battery', 'unavailable'] as const) {
      expect(homeCaptureNotice(health, fresh)).toBeNull();
      expect(homeCaptureNotice(health, { setupDone: true, inviteDismissed: false })).toBeNull();
    }
  });
});

describe('batteryBrand', () => {
  it.each([
    ['samsung', 'samsung'],
    ['Xiaomi', 'xiaomi'],
    ['POCO', 'xiaomi'],
    ['motorola', 'motorola'],
    ['realme', 'oppo'],
    ['OnePlus', 'oppo'],
    ['HONOR', 'huawei'],
    ['Google', 'other'],
    [undefined, 'other'],
  ])('%s → %s', (manufacturer, expected) => {
    expect(batteryBrand(manufacturer)).toBe(expected);
  });
});
