package app.kustho.receiptreader

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Porta de entrada do "Compartilhar" (Fase 3, trilha E). O menu de compartilhar abre o app
 * com flags que criam uma SEGUNDA MainActivity (dois NavigationContainer no mesmo JS, e o
 * roteador da primeira para de funcionar). Esta tela invisível recebe o comprovante e o
 * repassa à MainActivity que já existe (`onNewIntent`), com as flags do próprio app, e
 * fecha. O expo-sharing lê o mesmo intent (SEND + EXTRA_STREAM/EXTRA_TEXT) na MainActivity.
 * Declarada no manifesto pelo plugin `plugins/withSingleMainActivity.js`.
 */
class ShareReceiverActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val main = packageManager.getLaunchIntentForPackage(packageName)?.component
    if (main != null) {
      val forward = Intent(intent).apply {
        component = main
        // Descarta as flags de quem compartilhou (NEW_DOCUMENT, MULTIPLE_TASK…).
        flags = ShareForward.FLAGS
      }
      startActivity(forward)
    }
    finish()
  }
}

/** Regras puras do repasse (testadas no JUnit, sem Android). */
internal object ShareForward {
  /**
   * Leva à MainActivity existente (`singleTask` + `SINGLE_TOP` → `onNewIntent`) e mantém a
   * leitura da imagem/PDF compartilhado (a permissão vem no `clipData` copiado do intent).
   */
  const val FLAGS =
    Intent.FLAG_ACTIVITY_NEW_TASK or
      Intent.FLAG_ACTIVITY_CLEAR_TOP or
      Intent.FLAG_ACTIVITY_SINGLE_TOP or
      Intent.FLAG_GRANT_READ_URI_PERMISSION
}
