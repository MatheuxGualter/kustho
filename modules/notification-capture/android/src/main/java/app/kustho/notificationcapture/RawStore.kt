package app.kustho.notificationcapture

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import io.github.expo.modules.v2.Record
import java.util.UUID

/** Notificação gravada, como chega ao TypeScript (`RawNotification`). */
@Record
data class RawNotificationRecord(
  val id: String,
  val key: String,
  val packageName: String,
  val title: String?,
  val text: String?,
  val postedAtMs: Long,
  val capturedAtMs: Long
)

/**
 * SQLite próprio do módulo com as notificações cruas. Fica separado do banco do app: o
 * serviço grava mesmo com o app fechado, e o domínio lê as pendentes pela ponte.
 */
internal class RawStore private constructor(context: Context) :
  SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE raw_notifications (
        id TEXT PRIMARY KEY NOT NULL,
        sbn_key TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        package_name TEXT NOT NULL,
        title TEXT,
        text TEXT,
        posted_at_ms INTEGER NOT NULL,
        captured_at_ms INTEGER NOT NULL,
        processed_at_ms INTEGER,
        UNIQUE (sbn_key, content_hash)
      )
      """.trimIndent()
    )
    db.execSQL(
      "CREATE INDEX raw_notifications_pending ON raw_notifications (processed_at_ms, captured_at_ms)"
    )
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // Versão 1: nada a migrar ainda. Mudanças futuras entram aqui, nunca apagando os dados.
  }

  /** Grava a notificação; devolve `null` se a mesma `key` com o mesmo conteúdo já existe. */
  fun insert(
    key: String,
    packageName: String,
    title: String?,
    text: String?,
    postedAtMs: Long,
    capturedAtMs: Long
  ): RawNotificationRecord? {
    val record = RawNotificationRecord(
      id = UUID.randomUUID().toString(),
      key = key,
      packageName = packageName,
      title = title,
      text = text,
      postedAtMs = postedAtMs,
      capturedAtMs = capturedAtMs
    )
    val values = ContentValues().apply {
      put("id", record.id)
      put("sbn_key", key)
      put("content_hash", CaptureRules.contentHash(packageName, title, text))
      put("package_name", packageName)
      put("title", title)
      put("text", text)
      put("posted_at_ms", postedAtMs)
      put("captured_at_ms", capturedAtMs)
    }
    val rowId = writableDatabase.insertWithOnConflict(
      "raw_notifications",
      null,
      values,
      SQLiteDatabase.CONFLICT_IGNORE
    )
    return if (rowId == -1L) null else record
  }

  /** Pendentes da mais antiga para a mais nova. */
  fun getPending(limit: Int): List<RawNotificationRecord> =
    readableDatabase.rawQuery(
      """
      SELECT id, sbn_key, package_name, title, text, posted_at_ms, captured_at_ms
      FROM raw_notifications
      WHERE processed_at_ms IS NULL
      ORDER BY captured_at_ms, rowid
      LIMIT ?
      """.trimIndent(),
      arrayOf(limit.coerceAtLeast(0).toString())
    ).use { cursor ->
      buildList {
        while (cursor.moveToNext()) {
          add(
            RawNotificationRecord(
              id = cursor.getString(0),
              key = cursor.getString(1),
              packageName = cursor.getString(2),
              title = if (cursor.isNull(3)) null else cursor.getString(3),
              text = if (cursor.isNull(4)) null else cursor.getString(4),
              postedAtMs = cursor.getLong(5),
              capturedAtMs = cursor.getLong(6)
            )
          )
        }
      }
    }

  fun markProcessed(ids: List<String>, processedAtMs: Long) {
    if (ids.isEmpty()) return
    val db = writableDatabase
    db.beginTransaction()
    try {
      val values = ContentValues().apply { put("processed_at_ms", processedAtMs) }
      for (id in ids) {
        db.update("raw_notifications", values, "id = ? AND processed_at_ms IS NULL", arrayOf(id))
      }
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  companion object {
    private const val DATABASE_NAME = "kustho_notification_capture.db"
    private const val DATABASE_VERSION = 1

    @Volatile
    private var instance: RawStore? = null

    /** Uma instância por processo: o serviço e o módulo compartilham a mesma conexão. */
    fun get(context: Context): RawStore =
      instance ?: synchronized(this) {
        instance ?: RawStore(context.applicationContext).also { instance = it }
      }
  }
}
