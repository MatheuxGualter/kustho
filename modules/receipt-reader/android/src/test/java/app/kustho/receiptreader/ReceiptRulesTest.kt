package app.kustho.receiptreader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiptRulesTest {
  @Test
  fun `reconhece PDF pelo tipo ou pela extensão`() {
    assertTrue(ReceiptRules.isPdf("content://x/1", "application/pdf"))
    assertTrue(ReceiptRules.isPdf("file:///cache/Comprovante.PDF", null))
    assertTrue(ReceiptRules.isPdf("file:///cache/c.pdf?v=1", null))
    assertFalse(ReceiptRules.isPdf("content://x/1", "image/png"))
    assertFalse(ReceiptRules.isPdf("file:///cache/c.jpg", null))
  }

  @Test
  fun `escala a página até o lado maior chegar ao alvo, sem reduzir`() {
    assertEquals(ReceiptRules.TARGET_PAGE_PX / 842f, ReceiptRules.pdfScale(595, 842), 0.001f)
    assertEquals(1f, ReceiptRules.pdfScale(5000, 3000), 0.001f)
    assertEquals(ReceiptRules.TARGET_PAGE_PX.toFloat(), ReceiptRules.pdfScale(0, 0), 0.001f)
  }

  @Test
  fun `junta as páginas sem linhas vazias`() {
    assertEquals("a\nb", ReceiptRules.joinPages(listOf(" a ", "", "b")))
  }
}
