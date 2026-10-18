import { router } from 'expo-router';
import { BellRing, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { homeCaptureNotice } from '@/domain/captures/health';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { useTheme } from '@/ui/theme';

import { useCaptureDevice } from './useCaptureDevice';

const ICON_SIZE = 20;

/**
 * Seção da Início (Fase 2, trilha B): convida a ativar a leitura de notificações e avisa
 * quando ela para (acesso desligado ou nenhum banco escolhido).
 */
export function HomeCaptureNotice() {
  const { colors } = useTheme();
  const { health } = useCaptureDevice();
  const setupDone = usePreferences((s) => s.captureSetupDone);
  const inviteDismissed = usePreferences((s) => s.captureInviteDismissed);
  const dismissInvite = usePreferences((s) => s.dismissCaptureInvite);
  const notice = homeCaptureNotice(health, { setupDone, inviteDismissed });
  if (!notice) return null;

  const open = () => router.push('/captura/permissao');

  if (notice === 'invite') {
    return (
      <Card>
        <View className="flex-row items-center gap-2">
          <BellRing size={ICON_SIZE} color={colors.brand} />
          <AppText variant="label" className="flex-1">
            {strings.captureNotice.inviteTitle}
          </AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {strings.captureNotice.invite}
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          <Button label={strings.captureNotice.inviteAction} onPress={open} />
          <Button label={strings.captureNotice.dismiss} variant="ghost" onPress={dismissInvite} />
        </View>
      </Card>
    );
  }

  const reason = health === 'no_banks' ? 'no_banks' : 'no_permission';
  return (
    <Card>
      <View className="flex-row items-center gap-2">
        <TriangleAlert size={ICON_SIZE} color={colors.expense} />
        <AppText variant="label" className="flex-1">
          {strings.captureNotice.brokenTitle}
        </AppText>
      </View>
      <AppText variant="caption" tone="muted">
        {strings.captureNotice.broken[reason]}
      </AppText>
      <Button label={strings.captureNotice.fix} onPress={open} />
    </Card>
  );
}
