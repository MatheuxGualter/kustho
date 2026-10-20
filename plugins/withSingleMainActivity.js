/**
 * Uma tela principal só, mesmo vindo do menu de compartilhar (Fase 3, trilha E).
 *
 * O compartilhar do Android (e o da Samsung) abre o app com flags que criam uma SEGUNDA
 * MainActivity, mesmo com `singleTask`. As duas dividem o mesmo JS: aparecem dois
 * NavigationContainer ("multiple navigation containers", "linking in multiple places") e
 * o roteador da primeira para de funcionar ("imperative router is unavailable").
 *
 * Correção: os filtros de compartilhar que o expo-sharing põe na MainActivity passam para
 * uma tela invisível (`ShareReceiverActivity`, no módulo receipt-reader) que repassa o
 * intent à MainActivity existente com as flags do próprio app e fecha.
 * `documentLaunchMode="never"` fica como segunda proteção.
 */
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const SHARING_TAG = 'expo-sharing-intent-filters';
const RECEIVER = 'app.kustho.receiptreader.ShareReceiverActivity';

module.exports = function withSingleMainActivity(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
    main.$['android:launchMode'] = 'singleTask';
    main.$['android:documentLaunchMode'] = 'never';

    const filters = main['intent-filter'] ?? [];
    const sharing = filters.filter((f) => f.$?.[SHARING_TAG] === 'true');
    main['intent-filter'] = filters.filter((f) => f.$?.[SHARING_TAG] !== 'true');

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.activity = (application.activity ?? []).filter(
      (a) => a.$['android:name'] !== RECEIVER,
    );
    if (sharing.length > 0) {
      application.activity.push({
        $: {
          'android:name': RECEIVER,
          'android:exported': 'true',
          'android:label': '@string/app_name',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
          'android:excludeFromRecents': 'true',
          'android:noHistory': 'true',
          'android:taskAffinity': '',
        },
        'intent-filter': sharing,
      });
    }
    return config;
  });
};
