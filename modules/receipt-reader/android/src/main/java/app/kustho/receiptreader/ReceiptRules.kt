package app.kustho.receiptreader

/** Regras puras do leitor de comprovantes (testadas no JUnit, sem Android). */
internal object ReceiptRules {
  /** Comprovantes têm 1 ou 2 páginas; mais que isso é outro documento. */
  const val MAX_PDF_PAGES = 3

  /** Lado maior da página renderizada, em pixels: legível para o OCR sem estourar memória. */
  const val TARGET_PAGE_PX = 2000

  fun isPdf(uri: String, mimeType: String?): Boolean =
    mimeType?.lowercase() == "application/pdf" || uri.lowercase().substringBefore('?').endsWith(".pdf")

  /** Escala para o lado maior da página chegar a `TARGET_PAGE_PX` (no mínimo 1). */
  fun pdfScale(widthPt: Int, heightPt: Int): Float {
    val longest = maxOf(widthPt, heightPt).coerceAtLeast(1)
    return maxOf(1f, TARGET_PAGE_PX.toFloat() / longest)
  }

  /** Texto das páginas, na ordem, sem linhas vazias repetidas. */
  fun joinPages(pages: List<String>): String =
    pages.map { it.trim() }.filter { it.isNotEmpty() }.joinToString("\n")
}
