import { router, Stack } from 'expo-router';
import {
  BatteryCharging,
  Bell,
  Check,
  Circle,
  CircleCheck,
  Info,
  Share2,
  Stethoscope,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { bankApps, parsePackageList, suggestedPackages } from '@/domain/captures/bankApps';
import { batteryBrand } from '@/domain/captures/health';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { getBank, resolveBank } from '@/ui/banks/banks';
import { BankLogo } from '@/ui/banks/BankLogo';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { showToast } from '@/ui/components/Toast';
import { useTheme } from '@/ui/theme';
import { sizes } from '@/ui/tokens';

import { useCaptureDevice } from './useCaptureDevice';

const ICON_SIZE = 20;
const LOGO_SIZE = sizes.fab * 0.75;
const knownPackages = new Set(bankApps.map((app) => app.packageName));

/** `Platform.constants` do Android traz o fabricante; nos outros, não existe. */
const manufacturer =
  Platform.OS === 'android'
    ? ((Platform.constants as { Manufacturer?: string }).Manufacturer ?? null)
    : null;

/**
 * Configurar a leitura de notificações (Fase 2, trilha B): o que é lido, quais bancos,
 * liberar o acesso (com o passo de "configurações restritas") e a bateria.
 */
export function CaptureSetupScreen() {
  const { colors } = useTheme();
  const { module, state, setAllowedPackages } = useCaptureDevice();
  const setCaptureSetupDone = usePreferences((s) => s.setCaptureSetupDone);
  const { accounts, cards } = useServices();
  const userBanks = useServiceQuery(async () => {
    const [accountList, cardList] = await Promise.all([
      accounts.listAccountsWithBalance(),
      cards.listCardsWithSummary(),
    ]);
    return [
      ...accountList.map((a) => resolveBank(a.institution, a.icon)?.id),
      ...cardList.map((c) => resolveBank(c.institution)?.id),
    ].filter((id): id is NonNullable<typeof id> => id !== undefined);
  }, []);

  // `null` até o usuário mexer: aí vale o que está salvo ou, na primeira vez, os bancos das
  // contas e cartões.
  const [touched, setTouched] = useState<Set<string> | null>(null);
  const selected =
    touched ??
    new Set(
      state.allowedPackages.length > 0
        ? state.allowedPackages
        : suggestedPackages(userBanks.data ?? []),
    );
  const [others, setOthers] = useState(() =>
    state.allowedPackages.filter((p) => !knownPackages.has(p)).join(', '),
  );

  // Configurou acesso e bancos: a Início passa a avisar se a leitura parar.
  const ready = state.permissionGranted && state.allowedPackages.length > 0;
  useEffect(() => {
    if (ready) setCaptureSetupDone(true);
  }, [ready, setCaptureSetupDone]);

  const title = <Stack.Screen options={{ title: strings.screens.captureSetup.title }} />;
  if (!module) {
    return (
      <>
        {title}
        <Screen edges={['bottom']}>
          <AppText tone="muted">{strings.captureSetup.unavailable}</AppText>
        </Screen>
      </>
    );
  }

  const toggle = (packageName: string) => {
    const next = new Set(selected);
    if (next.has(packageName)) next.delete(packageName);
    else next.add(packageName);
    setTouched(next);
  };

  const saveBanks = () => {
    const packages = [
      ...new Set([
        ...[...selected].filter((p) => knownPackages.has(p)),
        ...parsePackageList(others),
      ]),
    ];
    setAllowedPackages(packages);
    showToast(strings.captureSetup.banksSaved(packages.length));
  };

  return (
    <>
      {title}
      <Screen edges={['bottom']}>
        <AppText>{strings.captureSetup.intro}</AppText>
        <Card>
          <View className="flex-row items-center gap-2">
            <Info size={ICON_SIZE} color={colors.brand} />
            <AppText variant="label">{strings.captureSetup.privacyTitle}</AppText>
          </View>
          {strings.captureSetup.privacy.map((line) => (
            <AppText key={line} variant="caption" tone="muted">
              {`• ${line}`}
            </AppText>
          ))}
        </Card>

        <Step n={1} title={strings.captureSetup.banksTitle} done={state.allowedPackages.length > 0}>
          <AppText variant="caption" tone="muted">
            {strings.captureSetup.banksHint}
          </AppText>
          <View accessibilityRole="list">
            {bankApps.map((app) => {
              const bank = getBank(app.bankId);
              const checked = selected.has(app.packageName);
              return (
                <Pressable
                  key={app.packageName}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={bank?.name ?? app.packageName}
                  onPress={() => toggle(app.packageName)}
                  className="min-h-touch flex-row items-center gap-3 py-1 active:bg-surface-raised"
                >
                  {bank ? <BankLogo bank={bank} size={LOGO_SIZE} /> : null}
                  <AppText className="flex-1">{bank?.name ?? app.packageName}</AppText>
                  {checked ? (
                    <CircleCheck size={ICON_SIZE} color={colors.brand} />
                  ) : (
                    <Circle size={ICON_SIZE} color={colors['text-muted']} />
                  )}
                </Pressable>
              );
            })}
          </View>
          <TextField
            label={strings.captureSetup.otherApps}
            hint={strings.captureSetup.otherAppsHint}
            autoCapitalize="none"
            autoCorrect={false}
            value={others}
            onChangeText={setOthers}
          />
          <Button label={strings.captureSetup.saveBanks} icon={Check} block onPress={saveBanks} />
        </Step>

        <Step n={2} title={strings.captureSetup.accessTitle} done={state.permissionGranted}>
          <AppText variant="caption" tone="muted">
            {strings.captureSetup.accessHint}
          </AppText>
          <Button
            label={strings.captureSetup.openAccess}
            icon={Bell}
            block
            variant={state.permissionGranted ? 'secondary' : 'primary'}
            onPress={() => module.openPermissionSettings()}
          />
          {state.permissionGranted ? null : (
            <View className="gap-2 rounded-input bg-surface-raised p-3">
              <AppText variant="label">{strings.captureSetup.restrictedTitle}</AppText>
              <AppText variant="caption" tone="muted">
                {strings.captureSetup.restricted}
              </AppText>
              <Button
                label={strings.captureSetup.openAppInfo}
                variant="ghost"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          )}
        </Step>

        <Step
          n={3}
          title={strings.captureSetup.batteryTitle}
          done={state.ignoringBatteryOptimizations}
        >
          <AppText variant="caption" tone="muted">
            {strings.captureSetup.batteryHint}
          </AppText>
          <Button
            label={strings.captureSetup.allowBattery}
            icon={BatteryCharging}
            block
            variant={state.ignoringBatteryOptimizations ? 'secondary' : 'primary'}
            onPress={() => module.requestIgnoreBatteryOptimizations()}
          />
          <AppText variant="caption" tone="muted">
            {strings.captureSetup.batteryBrandTip[batteryBrand(manufacturer)]}
          </AppText>
        </Step>

        {ready ? <AppText tone="brand">{strings.captureSetup.done}</AppText> : null}
        <Card>
          <View className="flex-row items-center gap-2">
            <Share2 size={ICON_SIZE} color={colors.brand} />
            <AppText variant="label" className="flex-1">
              {strings.receipts.tipTitle}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted">
            {strings.receipts.tip}
          </AppText>
        </Card>
        <Button
          label={strings.captureSetup.diagnostics}
          icon={Stethoscope}
          variant="ghost"
          onPress={() => router.push('/captura/diagnostico')}
        />
      </Screen>
    </>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <View className="flex-row items-center justify-between gap-2">
        <AppText variant="title" className="flex-1">
          {strings.captureSetup.step(n, title)}
        </AppText>
        <AppText variant="caption" tone={done ? 'brand' : 'muted'}>
          {done ? strings.captureSetup.status.ok : strings.captureSetup.status.pending}
        </AppText>
      </View>
      {children}
    </Card>
  );
}
