# Regras do módulo de leitura de comprovantes para o APK final (R8 / minify).
# No build de desenvolvimento não há R8; no release, o OCR do ML Kit falhava porque o código
# nativo (JNI) chama classes Java pelo nome e o R8 as renomeava ou removia.

# Nosso módulo (OCR e a tela de entrada do compartilhar).
-keep class app.kustho.receiptreader.** { *; }

# ML Kit Text Recognition (modelo latino embutido) e as dependências internas.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_bundled_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_common.** { *; }
-keep class com.google.android.odml.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.internal.mlkit_**
