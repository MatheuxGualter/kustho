import { Stack } from 'expo-router';
import { FileJson, FileSpreadsheet } from 'lucide-react-native';
import { useState } from 'react';
import { Share } from 'react-native';

import { errorMessage } from '@/features/shared/errorMessage';
import { type ExportData, toCsv, toJson } from '@/domain/export/export';
import { nowTimestamp } from '@/lib/id';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { showToast } from '@/ui/components/Toast';

/** Exportar CSV (planilha) ou JSON (backup), pelo compartilhamento do sistema. */
export function ExportScreen() {
  const services = useServices();
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
  const count = useServiceQuery(
    async () => (await services.transactions.listAllTransactions()).length,
    [],
  );

  const load = async (): Promise<ExportData> => {
    const [accounts, cards, categories, transactions] = await Promise.all([
      services.accounts.listAccountsWithBalance({ includeArchived: true }),
      services.cards.listCardsWithSummary({ includeArchived: true }),
      services.categories.listCategories(),
      services.transactions.listAllTransactions(),
    ]);
    return { accounts, cards, categories, transactions };
  };

  const share = async (format: 'csv' | 'json') => {
    setBusy(format);
    try {
      const data = await load();
      const message = format === 'csv' ? toCsv(data) : toJson(data, nowTimestamp());
      await Share.share({ title: strings.exportData.shareTitle, message });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.export.title }} />
      <Screen edges={['bottom']}>
        <AppText tone="muted">{strings.exportData.intro}</AppText>
        {count.data !== undefined ? (
          <AppText variant="caption" tone="muted">
            {strings.exportData.count(count.data)}
          </AppText>
        ) : null}
        <Card>
          <AppText variant="caption" tone="muted">
            {strings.exportData.csvHint}
          </AppText>
          <Button
            label={strings.exportData.csv}
            icon={FileSpreadsheet}
            block
            loading={busy === 'csv'}
            disabled={busy !== null}
            onPress={() => void share('csv')}
          />
        </Card>
        <Card>
          <AppText variant="caption" tone="muted">
            {strings.exportData.jsonHint}
          </AppText>
          <Button
            label={strings.exportData.json}
            icon={FileJson}
            variant="secondary"
            block
            loading={busy === 'json'}
            disabled={busy !== null}
            onPress={() => void share('json')}
          />
        </Card>
      </Screen>
    </>
  );
}
