package app.kustho.notificationcapture

import java.security.MessageDigest

/** Regras puras da captura, sem dependência do Android (testadas com JUnit). */
internal object CaptureRules {
  /** `adb shell cmd notification post` publica como este pacote (ver scripts/simulate-notification.sh). */
  const val SHELL_PACKAGE = "com.android.shell"

  /** Só pacotes permitidos; o shell entra apenas em build de depuração, para simular bancos. */
  fun shouldCapture(packageName: String, allowed: Set<String>, isDebuggable: Boolean): Boolean =
    packageName in allowed || (isDebuggable && packageName == SHELL_PACKAGE)

  /**
   * O texto mais completo: o expandido (BigTextStyle), senão as linhas (InboxStyle), senão o
   * curto. Bancos costumam cortar o valor ou o estabelecimento no texto curto.
   */
  fun bestText(text: String?, bigText: String?, lines: List<String>?): String? =
    bigText?.takeIf { it.isNotBlank() }
      ?: lines?.filter { it.isNotBlank() }?.takeIf { it.isNotEmpty() }?.joinToString("\n")
      ?: text?.takeIf { it.isNotBlank() }

  /**
   * Hash do conteúdo. Junto com `sbn.key` forma a chave de dedupe: o Android reposta a mesma
   * notificação a cada atualização, e só um conteúdo novo deve gerar outro registro.
   */
  fun contentHash(packageName: String, title: String?, text: String?): String {
    // \u0000 separa os campos: "a" + "bc" e "ab" + "c" não podem colidir.
    val content = listOf(packageName, title.orEmpty(), text.orEmpty()).joinToString("\u0000")
    val digest = MessageDigest.getInstance("SHA-256").digest(content.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }
}
