import { type Href, router } from 'expo-router';

/**
 * Volta uma tela; se não houver para onde (tela aberta direto, como a confirmação que o
 * compartilhar de um comprovante abre), vai para `fallback`.
 */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
