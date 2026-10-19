package app.kustho.receiptreader

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.androidContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

/**
 * OCR de comprovantes no aparelho (Fase 3, trilha E). Recebe a URI de uma imagem ou PDF
 * compartilhado com o Kustho e devolve o texto. Ponte: `ReceiptReaderApi` em
 * src/ReceiptReader.types.ts. Toda a interpretação acontece em TypeScript.
 */
@ExpoModule("ReceiptReader")
class ReceiptReaderModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun onDestroy() {
    recognizer.close()
  }

  @JS
  suspend fun recognizeText(uri: String, mimeType: String?): String {
    val images = withContext(Dispatchers.IO) {
      val parsed = Uri.parse(uri)
      if (ReceiptRules.isPdf(uri, mimeType)) renderPdf(parsed) else listOf(InputImage.fromFilePath(androidContext, parsed))
    }
    return ReceiptRules.joinPages(images.map { recognize(it) })
  }

  /** Primeiras páginas do PDF como imagens com fundo branco (o PDF costuma ser transparente). */
  private fun renderPdf(uri: Uri): List<InputImage> {
    val descriptor = androidContext.contentResolver.openFileDescriptor(uri, "r")
      ?: throw IllegalArgumentException("Não foi possível abrir o PDF")
    return descriptor.use { pfd ->
      PdfRenderer(pfd).use { renderer ->
        (0 until minOf(renderer.pageCount, ReceiptRules.MAX_PDF_PAGES)).map { index ->
          renderer.openPage(index).use { page ->
            val scale = ReceiptRules.pdfScale(page.width, page.height)
            val bitmap = Bitmap.createBitmap(
              (page.width * scale).toInt(),
              (page.height * scale).toInt(),
              Bitmap.Config.ARGB_8888
            )
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            InputImage.fromBitmap(bitmap, 0)
          }
        }
      }
    }
  }

  private suspend fun recognize(image: InputImage): String =
    suspendCancellableCoroutine { continuation ->
      recognizer.process(image)
        .addOnSuccessListener { result -> continuation.resume(result.text) }
        .addOnFailureListener { error -> continuation.resumeWithException(error) }
    }
}
