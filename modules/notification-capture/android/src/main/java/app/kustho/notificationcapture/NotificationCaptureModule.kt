package app.kustho.notificationcapture

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.service.notification.NotificationListenerService
import io.github.expo.modules.v2.Event
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.androidContext
import io.github.expo.modules.v2.react.currentActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Ponte para o TypeScript (`NotificationCaptureApi` em src/NotificationCapture.types.ts). */
@ExpoModule("NotificationCapture")
class NotificationCaptureModule : Module() {
  private val listenerComponent: ComponentName
    get() = ComponentName(androidContext, BankListener::class.java)

  @Event(name = "onCaptured")
  private val onCaptured = event<RawNotificationRecord>(
    onStartObserving = { startForwarding() },
    onStopObserving = { CaptureEvents.listener = null }
  )

  private fun startForwarding() {
    CaptureEvents.listener = { record -> onCaptured(record) }
  }

  override fun onDestroy() {
    CaptureEvents.listener = null
  }

  @JS
  fun isPermissionGranted(): Boolean {
    // Mesmo critério do NotificationManagerCompat.getEnabledListenerPackages.
    val enabled = Settings.Secure.getString(
      androidContext.contentResolver,
      "enabled_notification_listeners"
    ) ?: return false
    return enabled.split(':').any {
      ComponentName.unflattenFromString(it)?.packageName == androidContext.packageName
    }
  }

  @JS
  fun openPermissionSettings() {
    // Android 11+ abre direto no Kustho; alguns fabricantes não têm essa tela.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val detail = Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
        .putExtra(
          Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
          listenerComponent.flattenToString()
        )
      if (start(detail)) return
    }
    start(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
  }

  @JS
  fun isIgnoringBatteryOptimizations(): Boolean {
    val power = androidContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    return power.isIgnoringBatteryOptimizations(androidContext.packageName)
  }

  @JS
  fun requestIgnoreBatteryOptimizations() {
    val request = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
      .setData(Uri.parse("package:${androidContext.packageName}"))
    if (!start(request)) start(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
  }

  @JS
  fun requestRebind() {
    if (!isPermissionGranted()) return
    try {
      NotificationListenerService.requestRebind(listenerComponent)
    } catch (_: SecurityException) {
      // Permissão retirada entre a conferência e o pedido: nada a religar.
    }
  }

  @JS
  fun setAllowedPackages(packages: List<String>) {
    CaptureSettings.setAllowedPackages(androidContext, packages)
  }

  @JS
  fun getAllowedPackages(): List<String> =
    CaptureSettings.allowedPackages(androidContext).sorted()

  @JS
  suspend fun getPending(limit: Int): List<RawNotificationRecord> = withContext(Dispatchers.IO) {
    RawStore.get(androidContext).getPending(limit)
  }

  @JS
  suspend fun markProcessed(ids: List<String>): Unit = withContext(Dispatchers.IO) {
    RawStore.get(androidContext).markProcessed(ids, System.currentTimeMillis())
  }

  /** Abre uma tela do sistema; devolve `false` se o aparelho não tiver essa tela. */
  private fun start(intent: Intent): Boolean {
    val activity = currentActivity
    return try {
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        androidContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    } catch (_: ActivityNotFoundException) {
      false
    }
  }
}
