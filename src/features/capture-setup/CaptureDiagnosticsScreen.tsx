import { router, Stack } from 'expo-router';
import { RefreshCw, Settings2, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { bankAppForPackage } from '@/domain/captures/bankApps';
import { summarizeByPackage, toFixtureExport } from '@/domain/captures/diagnostics';
import { errorMessage } from '@/features/shared/errorMessage';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { getBank } from '@/ui/banks/banks';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';

import { useCaptureDevice } from './useCaptureDevice';

/** Quantas capturas recentes entram no resumo e na exportação. */
const RECENT_LIMIT = 200;

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const appName = (packageName: string) => {
  const app = bankAppForPackage(packageName);
  return (app && getBank(app.bankId)?.name) ?? packageName;
};

/** Diagnóstico da captura (Fase 2, trilha B): saúde do serviço, resumo por app e exportação. */
export function CaptureDiagnosticsScreen() {
  const { captures } = useServices();
  const { state, health, refresh } = useCaptureDevice();
  const recent = useServiceQuery(() => captures.listRecent(RECENT_LIMIT), []);
  const [busy, setBusy] = useState<'fetch' | 'export' | null>(null);

  const fetchNow = async () => {
    setBusy('fetch');
    try {
      refresh();
      showToast(strings.captureDiagnostics.fetched(await captures.ingest()));
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const exportAnonymized = async () => {
    setBusy('export');
    try {
      const list = await captures.listRecent(RECENT_LIMIT);
      const message = JSON.stringify(toFixtureExport(list), null, 2);
      await Share.share({ title: strings.captureDiagnostics.shareTitle, message });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const yesNo = (value: boolean) =>
    value ? strings.captureDiagnostics.yes : strings.captureDiagnostics.no;
  const summary = recent.data ? summarizeByPackage(recent.data) : null;

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.captureDiagnostics.title }} />
      <Screen edges={['bottom']}>
        <Card>
          <AppText variant="title" tone={health === 'ok' ? 'brand' : 'expense'}>
            {strings.captureDiagnostics.health[health]}
          </AppText>
          <Row label={strings.captureDiagnostics.access} value={yesNo(state.permissionGranted)} />
          <Row
            label={strings.captureDiagnostics.battery}
            value={yesNo(state.ignoringBatteryOptimizations)}
          />
          <Row
            label={strings.captureDiagnostics.apps}
            value={
              state.allowedPackages.length > 0
                ? state.allowedPackages.map(appName).join(', ')
                : strings.captureDiagnostics.no
            }
          />
          <View className="flex-row flex-wrap gap-2">
            {health === 'ok' || health === 'unavailable' ? null : (
              <Button
                label={strings.captureDiagnostics.setup}
                icon={Settings2}
                onPress={() => router.push('/captura/permissao')}
              />
            )}
            <Button
              label={strings.captureDiagnostics.fetchNow}
              icon={RefreshCw}
              variant="secondary"
              loading={busy === 'fetch'}
              disabled={busy !== null}
              onPress={() => void fetchNow()}
            />
          </View>
        </Card>

        <Card>
          <AppText variant="label">{strings.captureDiagnostics.recentTitle}</AppText>
          {!summary ? (
            <SkeletonRows />
          ) : summary.length === 0 ? (
            <AppText variant="caption" tone="muted">
              {strings.captureDiagnostics.recentEmpty}
            </AppText>
          ) : (
            summary.map((row) => (
              <View key={row.packageName} className="gap-1 border-t border-border pt-2">
                <AppText variant="label">{appName(row.packageName)}</AppText>
                <AppText variant="caption" tone="muted">
                  {strings.captureDiagnostics.packageRow(row.total, row.unparsed)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {strings.captureDiagnostics.lastAt(formatWhen(row.lastPostedAt))}
                </AppText>
              </View>
            ))
          )}
        </Card>

        <Card>
          <AppText variant="label">{strings.captureDiagnostics.exportTitle}</AppText>
          <AppText variant="caption" tone="muted">
            {strings.captureDiagnostics.exportHint}
          </AppText>
          <Button
            label={strings.captureDiagnostics.export}
            icon={Share2}
            variant="secondary"
            block
            loading={busy === 'export'}
            disabled={busy !== null || !summary || summary.length === 0}
            onPress={() => void exportAnonymized()}
          />
        </Card>
      </Screen>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="caption" className="flex-1 text-right">
        {value}
      </AppText>
    </View>
  );
}
