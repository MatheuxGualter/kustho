package app.kustho.notificationcapture

import android.content.Context
import android.content.pm.ApplicationInfo

/** Lista de pacotes permitidos, lida pelo serviço mesmo com o app fechado. */
internal object CaptureSettings {
  private const val PREFERENCES = "kustho_notification_capture"
  private const val ALLOWED_PACKAGES = "allowed_packages"

  fun allowedPackages(context: Context): Set<String> =
    preferences(context).getStringSet(ALLOWED_PACKAGES, null)?.toSet() ?: emptySet()

  fun setAllowedPackages(context: Context, packages: Collection<String>) {
    preferences(context).edit().putStringSet(ALLOWED_PACKAGES, packages.toSet()).apply()
  }

  /** Build de depuração do app (não da biblioteca): libera o `com.android.shell`. */
  fun isDebuggable(context: Context): Boolean =
    (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  private fun preferences(context: Context) =
    context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
}

/** Avisa o módulo de cada gravação enquanto o JS está ouvindo `onCaptured`. */
internal object CaptureEvents {
  @Volatile
  var listener: ((RawNotificationRecord) -> Unit)? = null

  fun emit(record: RawNotificationRecord) {
    listener?.invoke(record)
  }
}
