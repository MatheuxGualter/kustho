// Projeto JVM mínimo só para rodar os testes JUnit das regras puras do módulo (CaptureRules)
// no CI, sem Android SDK nem o app inteiro. No aparelho/Android Studio, o mesmo teste roda
// com `cd android && ./gradlew :notification-capture:testDebugUnitTest`.
rootProject.name = "notification-capture-jvm-tests"
