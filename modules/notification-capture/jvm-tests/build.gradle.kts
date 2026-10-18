plugins {
  kotlin("jvm") version "2.1.20"
}

repositories {
  mavenCentral()
}


sourceSets {
  main {
    kotlin.srcDir("../android/src/main/java")
    // Só as regras puras: o resto do módulo depende do Android.
    kotlin.include("**/CaptureRules.kt")
  }
  test {
    kotlin.srcDir("../android/src/test/java")
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
