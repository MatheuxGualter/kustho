import { createContext, type ReactNode, useContext } from 'react';

import { ReceiptReader, type ReceiptReaderApi } from '../../../modules/receipt-reader';

/** O OCR nativo, ou um fake nos testes. `null` onde o módulo não existe. */
const ReceiptReaderContext = createContext<ReceiptReaderApi | null>(ReceiptReader);

export function ReceiptReaderProvider({
  reader,
  children,
}: {
  reader: ReceiptReaderApi | null;
  children: ReactNode;
}) {
  return <ReceiptReaderContext.Provider value={reader}>{children}</ReceiptReaderContext.Provider>;
}

export const useReceiptReader = () => useContext(ReceiptReaderContext);
