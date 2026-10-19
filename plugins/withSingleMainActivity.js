/**
 * Uma tela principal só, mesmo vindo do menu de compartilhar (Fase 3, trilha E).
 *
 * O compartilhar do Android (e o da Samsung) abre o app com FLAG_ACTIVITY_NEW_DOCUMENT /
 * MULTIPLE_TASK, o que cria uma SEGUNDA MainActivity apesar do `singleTask`. As duas
 * dividem o mesmo JS: aparecem dois NavigationContainer ("multiple navigation
 * containers", "linking in multiple places") e o roteador da primeira para de funcionar
 * ("imperative router is unavailable"). `documentLaunchMode="never"` ignora essas flags e
 * entrega o compartilhamento à instância que já existe (onNewIntent), que o expo-sharing
 * já trata.
 */
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withSingleMainActivity(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$['android:launchMode'] = 'singleTask';
    activity.$['android:documentLaunchMode'] = 'never';
    return config;
  });
};
