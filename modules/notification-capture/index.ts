import { requireOptionalNativeModule } from 'expo';

import type { NotificationCaptureApi } from './src/NotificationCapture.types';

export * from './src/NotificationCapture.types';
export { createFakeNotificationCapture, type FakeNotificationCapture } from './src/fake';

/**
 * Módulo nativo de captura, ou `null` onde ele não existe (iOS, web, Jest). Quem usa decide o
 * que fazer sem ele; nos testes, use `createFakeNotificationCapture()`.
 */
export const NotificationCapture =
  requireOptionalNativeModule<NotificationCaptureApi>('NotificationCapture');
