import { requireOptionalNativeModule } from 'expo';

import type { ReceiptReaderApi } from './src/ReceiptReader.types';

export * from './src/ReceiptReader.types';

/** OCR no aparelho, ou `null` onde o módulo não existe (iOS, web, Jest, build antigo). */
export const ReceiptReader = requireOptionalNativeModule<ReceiptReaderApi>('ReceiptReader');
