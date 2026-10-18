import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/**
 * Compartilha um texto como arquivo (CSV, JSON) pelo menu do sistema. Sem o módulo de
 * compartilhamento (dev client antigo), cai no compartilhamento de texto.
 */
export async function shareTextFile({
  name,
  content,
  mimeType,
  title,
}: {
  name: string;
  content: string;
  mimeType: string;
  title: string;
}): Promise<void> {
  if (!(await Sharing.isAvailableAsync().catch(() => false))) {
    await Share.share({ title, message: content });
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  // Bytes UTF-8 explícitos: assim o BOM do CSV chega ao arquivo e planilhas (Google
  // Planilhas, Excel) leem os acentos certo em vez de "AlimentaÃ§Ã£o".
  await file.write(new TextEncoder().encode(content));
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: title });
}
