package app.kustho.notificationcapture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CaptureRulesTest {
  private val nubank = "com.nu.production"

  @Test
  fun `grava só pacotes permitidos`() {
    assertTrue(CaptureRules.shouldCapture(nubank, setOf(nubank), isDebuggable = false))
    assertFalse(CaptureRules.shouldCapture("com.whatsapp", setOf(nubank), isDebuggable = false))
    assertFalse(CaptureRules.shouldCapture(nubank, emptySet(), isDebuggable = false))
  }

  @Test
  fun `shell só em build de depuração`() {
    val shell = CaptureRules.SHELL_PACKAGE
    assertTrue(CaptureRules.shouldCapture(shell, emptySet(), isDebuggable = true))
    assertFalse(CaptureRules.shouldCapture(shell, emptySet(), isDebuggable = false))
  }

  @Test
  fun `texto expandido vence linhas e texto curto`() {
    assertEquals(
      "Compra de R$ 45,90 em PADARIA",
      CaptureRules.bestText("Compra de R$ 45,90…", "Compra de R$ 45,90 em PADARIA", listOf("x"))
    )
    assertEquals("a\nb", CaptureRules.bestText("curto", null, listOf("a", " ", "b")))
    assertEquals("curto", CaptureRules.bestText("curto", " ", emptyList()))
    assertNull(CaptureRules.bestText(" ", null, null))
  }

  @Test
  fun `mesmo conteúdo gera o mesmo hash`() {
    assertEquals(
      CaptureRules.contentHash(nubank, "Compra aprovada", "R$ 12,90"),
      CaptureRules.contentHash(nubank, "Compra aprovada", "R$ 12,90")
    )
  }

  @Test
  fun `conteúdo, título ou pacote diferente gera outro hash`() {
    val base = CaptureRules.contentHash(nubank, "Compra aprovada", "R$ 12,90")
    assertNotEquals(base, CaptureRules.contentHash(nubank, "Compra aprovada", "R$ 40,00"))
    assertNotEquals(base, CaptureRules.contentHash(nubank, "Pix recebido", "R$ 12,90"))
    assertNotEquals(base, CaptureRules.contentHash("com.itau", "Compra aprovada", "R$ 12,90"))
  }

  @Test
  fun `campos não se misturam no hash`() {
    assertNotEquals(
      CaptureRules.contentHash(nubank, "ab", "c"),
      CaptureRules.contentHash(nubank, "a", "bc")
    )
    assertNotEquals(
      CaptureRules.contentHash(nubank, null, "x"),
      CaptureRules.contentHash(nubank, "x", null)
    )
  }
}
