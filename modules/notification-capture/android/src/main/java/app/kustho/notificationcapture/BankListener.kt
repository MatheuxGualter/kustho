package app.kustho.notificationcapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Recebe as notificações do sistema e grava só as dos pacotes permitidos no `RawStore`.
 * Não interpreta nada: valor, estabelecimento e tipo são extraídos em TypeScript.
 */
class BankListener : NotificationListenerService() {
  // O callback roda na thread principal; a gravação vai para uma thread própria, em ordem.
  private val writer: ExecutorService = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "kustho-notification-capture")
  }

  /**
   * Ao (re)conectar — permissão recém-dada, reinício do celular, religação depois de o sistema
   * derrubar o serviço — grava o que ainda está na bandeja. O dedupe ignora o que já existe.
   */
  override fun onListenerConnected() {
    val active = try {
      activeNotifications
    } catch (e: SecurityException) {
      Log.w(TAG, "Sem acesso às notificações ativas", e)
      null
    }
    active?.forEach(::onNotificationPosted)
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val context = applicationContext
    val allowed = CaptureSettings.allowedPackages(context)
    if (!CaptureRules.shouldCapture(sbn.packageName, allowed, CaptureSettings.isDebuggable(context))) {
      return
    }

    val notification = sbn.notification
    // O resumo de grupo ("3 novas notificações") repete as filhas, que chegam uma a uma.
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

    val extras = notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val text = CaptureRules.bestText(
      text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
      bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
      lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.map { it.toString() }
    )
    if (title.isNullOrBlank() && text == null) return

    val key = sbn.key
    val packageName = sbn.packageName
    val postedAtMs = sbn.postTime
    writer.execute {
      try {
        RawStore.get(context)
          .insert(key, packageName, title, text, postedAtMs, System.currentTimeMillis())
          ?.let(CaptureEvents::emit)
      } catch (e: Exception) {
        // Uma falha de gravação não pode derrubar o serviço (o sistema demora a religá-lo).
        Log.e(TAG, "Falha ao gravar notificação de $packageName", e)
      }
    }
  }

  override fun onDestroy() {
    writer.shutdown()
    super.onDestroy()
  }

  private companion object {
    const val TAG = "KusthoCapture"
  }
}
