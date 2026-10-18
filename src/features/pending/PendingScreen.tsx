import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, CheckCheck, Inbox, Pencil, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { resolveConfirmation } from '@/domain/captures/rules';
import type { Capture } from '@/domain/types';
import { errorMessage } from '@/features/shared/errorMessage';
import { formatDateBR, toISODate } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { useServiceQuery, useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { EmptyState } from '@/ui/components/EmptyState';
import { MoneyText } from '@/ui/components/MoneyText';
import { Screen } from '@/ui/components/Screen';
import { SkeletonRows } from '@/ui/components/Skeleton';
import { showToast } from '@/ui/components/Toast';

import { useCaptureDevice } from '@/features/capture-setup/useCaptureDevice';

/** Caixa de Pendentes (Fase 2, trilha D): sugestões das notificações para confirmar. */
export function PendingScreen() {
  const services = useServices();
  const { health: captureHealth } = useCaptureDevice();
  const query = useServiceQuery(async () => {
    // Ao abrir a aba, traz o que o módulo gravou desde a última leitura.
    await services.captures.ingest();
    const [pending, accounts, cards] = await Promise.all([
      services.captures.listPending(),
      services.accounts.listAccountsWithBalance(),
      services.cards.listCardsWithSummary(),
    ]);
    const names = new Map<string, string>([
      ...accounts.map((a) => [a.id, a.name] as const),
      ...cards.map((c) => [c.id, c.name] as const),
    ]);
    return { pending, names };
  }, []);
  const [busy, setBusy] = useState(false);

  const data = query.data;
  if (!data) {
    return (
      <Screen title={strings.screens.pending.title}>
        <SkeletonRows />
      </Screen>
    );
  }

  const ready = data.pending.filter((c) => resolveConfirmation(c, {}) !== null);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      const message = await action();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(message);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const discard = async (capture: Capture) => {
    try {
      await services.captures.discardCapture(capture.id);
      showToast(strings.pending.discarded, () => {
        void services.captures.restoreCapture(capture.id);
      });
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  return (
    <Screen title={strings.screens.pending.title}>
      {data.pending.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={strings.pending.emptyTitle}
          description={strings.pending.emptyText}
          action={
            captureHealth === 'ok' || captureHealth === 'unavailable'
              ? undefined
              : {
                  label: strings.pending.setupAction,
                  onPress: () => router.push('/captura/permissao'),
                }
          }
        />
      ) : null}

      {ready.length > 1 ? (
        <Button
          label={strings.pending.confirmAll(ready.length)}
          icon={CheckCheck}
          block
          loading={busy}
          onPress={() =>
            void run(async () => {
              const { confirmed } = await services.captures.confirmMany(ready.map((c) => c.id));
              return strings.pending.confirmedMany(confirmed.length);
            })
          }
        />
      ) : null}

      {data.pending.map((capture) => (
        <PendingCard
          key={capture.id}
          capture={capture}
          originName={data.names.get(capture.suggestedAccountId ?? capture.suggestedCardId ?? '')}
          ready={ready.includes(capture)}
          busy={busy}
          onConfirm={() =>
            void run(async () => {
              await services.captures.confirmCapture(capture.id);
              return strings.pending.confirmed;
            })
          }
          onEdit={() => router.push({ pathname: '/pendente/[id]', params: { id: capture.id } })}
          onDiscard={() => void discard(capture)}
        />
      ))}
    </Screen>
  );
}

function PendingCard({
  capture,
  originName,
  ready,
  busy,
  onConfirm,
  onEdit,
  onDiscard,
}: {
  capture: Capture;
  originName: string | undefined;
  ready: boolean;
  busy: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  const unparsed = capture.parser === null;
  const amount = capture.amountCents ?? 0;
  const signed = capture.kind === 'income' ? amount : -amount;
  const description = capture.merchant ?? capture.title ?? capture.packageName;
  const date = capture.date ?? toISODate(new Date(capture.postedAt));

  return (
    <Card accessibilityLabel={description}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="label" numberOfLines={2}>
            {description}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {[
              capture.kind ? strings.pending.kinds[capture.kind] : strings.pending.unparsed,
              originName ?? strings.pending.noOrigin,
              formatDateBR(date),
            ].join(' · ')}
          </AppText>
        </View>
        {capture.amountCents ? (
          <MoneyText cents={signed} tone={capture.kind === 'income' ? 'income' : 'expense'} />
        ) : null}
      </View>

      {capture.text ? (
        <AppText variant="caption" tone="muted" numberOfLines={3}>
          {capture.text}
        </AppText>
      ) : null}
      {unparsed ? (
        <AppText variant="caption" tone="muted">
          {strings.pending.unparsedHint}
        </AppText>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {ready ? (
          <Button
            label={strings.pending.confirm}
            icon={Check}
            disabled={busy}
            onPress={onConfirm}
          />
        ) : null}
        <Button
          label={ready ? strings.pending.edit : strings.pending.complete}
          icon={Pencil}
          variant={ready ? 'secondary' : 'primary'}
          disabled={busy}
          onPress={onEdit}
        />
        <Button
          label={strings.pending.discard}
          icon={X}
          variant="ghost"
          disabled={busy}
          onPress={onDiscard}
        />
      </View>
    </Card>
  );
}
