plugins {
  kotlin("jvm") version "2.1.20"
}

repositories {
  mavenCentral()
}


sourceSets {
  main {
    kotlin.srcDir("../android/src/main/java")
    kotlin.srcDir("../../receipt-reader/android/src/main/java")
    // Só as regras puras: o resto dos módulos depende do Android.
    kotlin.include("**/CaptureRules.kt", "**/ReceiptRules.kt")
  }
  test {
    kotlin.srcDir("../android/src/test/java")
    kotlin.srcDir("../../receipt-reader/android/src/test/java")
  }
}

dependencies {
  testImplementation("junit:junit:4.13.2")
}

tasks.test {
  testLogging {
    events("passed", "failed")
  }
}
