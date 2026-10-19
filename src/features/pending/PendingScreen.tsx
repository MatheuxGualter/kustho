import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Bell, Check, CheckCheck, Link2, Pencil, Sparkles, Undo2, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { resolveConfirmation } from '@/domain/captures/rules';
import type { Capture, Transaction } from '@/domain/types';
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
import { useTheme } from '@/ui/theme';

import { useCaptureDevice } from '@/features/capture-setup/useCaptureDevice';

/** Dias do resumo "entraram sozinhos". */
const AUTO_SUMMARY_DAYS = 7;

/** Caixa de Pendentes (Fase 2, trilha D): sugestões das notificações para confirmar. */
export function PendingScreen() {
  const services = useServices();
  const { health: captureHealth } = useCaptureDevice();
  const query = useServiceQuery(async () => {
    // Ao abrir a aba, traz o que o módulo gravou desde a última leitura.
    await services.captures.ingest();
    // Fase 3 (trilha D): o que entrou sozinho nos últimos dias, para conferir e desfazer.
    const since = new Date(Date.now() - AUTO_SUMMARY_DAYS * 86_400_000).toISOString();
    const [pending, accounts, cards, auto] = await Promise.all([
      services.captures.listPending(),
      services.accounts.listAccountsWithBalance(),
      services.cards.listCardsWithSummary(),
      services.captures.listAutoConfirmed(since),
    ]);
    const names = new Map<string, string>([
      ...accounts.map((a) => [a.id, a.name] as const),
      ...cards.map((c) => [c.id, c.name] as const),
    ]);
    // Fase 3 (trilha A): lançamentos já existentes que parecem ser a mesma transação.
    const matches = new Map<string, Transaction>();
    for (const c of pending) {
      if (!c.matchTransactionId) continue;
      const tx = await services.transactions.getTransaction(c.matchTransactionId);
      if (tx) matches.set(c.id, tx);
    }
    return { pending, names, matches, auto };
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

  const undoAuto = (capture: Capture) =>
    void run(async () => {
      await services.captures.undoAutoConfirm(capture.id);
      return strings.pending.undone;
    });

  return (
    <Screen title={strings.screens.pending.title}>
      {data.auto.length > 0 ? (
        <AutoSummary captures={data.auto} busy={busy} onUndo={undoAuto} />
      ) : null}

      {data.pending.length === 0 ? (
        <EmptyState
          icon={Bell}
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
              // As que parecem um lançamento existente são vinculadas, não duplicadas. Estorno
              // aponta a compra: é confirmado (vira o estorno na fatura), não vinculado.
              const toLink = ready.filter(
                (c) => c.kind !== 'card_refund' && data.matches.has(c.id),
              );
              for (const c of toLink) {
                await services.captures.linkCapture(c.id, data.matches.get(c.id)!.id);
              }
              const { confirmed } = await services.captures.confirmMany(
                ready.filter((c) => !toLink.includes(c)).map((c) => c.id),
              );
              return strings.pending.confirmedMany(confirmed.length + toLink.length);
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
          match={capture.kind === 'card_refund' ? undefined : data.matches.get(capture.id)}
          refundOf={capture.kind === 'card_refund' ? data.matches.get(capture.id) : undefined}
          busy={busy}
          onLink={(tx) =>
            void run(async () => {
              await services.captures.linkCapture(capture.id, tx.id);
              return strings.pending.linked;
            })
          }
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

/** Resumo do que o nível automático lançou, com selo e "Desfazer" (Fase 3, trilha D). */
function AutoSummary({
  captures,
  busy,
  onUndo,
}: {
  captures: Capture[];
  busy: boolean;
  onUndo: (capture: Capture) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <View className="flex-row items-center gap-2">
        <Sparkles size={18} color={colors.brand} />
        <AppText variant="label" className="flex-1">
          {strings.pending.autoTitle(captures.length)}
        </AppText>
      </View>
      <AppText variant="caption" tone="muted">
        {strings.pending.autoHint}
      </AppText>
      {captures.map((capture) => {
        const amount = capture.amountCents ?? 0;
        const description = capture.merchant ?? capture.title ?? capture.packageName;
        return (
          <View
            key={capture.id}
            className="min-h-touch flex-row items-center gap-3 border-t border-border pt-2"
          >
            <View className="flex-1 gap-1">
              <AppText variant="label" numberOfLines={1}>
                {description}
              </AppText>
              <View className="flex-row items-center gap-2">
                <View className="rounded-input bg-surface-raised px-2">
                  <AppText variant="caption" tone="brand">
                    {strings.pending.autoBadge}
                  </AppText>
                </View>
                {capture.date ? (
                  <AppText variant="caption" tone="muted">
                    {formatDateBR(capture.date)}
                  </AppText>
                ) : null}
              </View>
            </View>
            <MoneyText
              cents={capture.kind === 'income' ? amount : -amount}
              tone={capture.kind === 'income' ? 'income' : 'expense'}
            />
            <Button
              label={strings.pending.undo}
              icon={Undo2}
              variant="ghost"
              disabled={busy}
              onPress={() => onUndo(capture)}
            />
          </View>
        );
      })}
    </Card>
  );
}

function PendingCard({
  capture,
  originName,
  ready,
  match,
  refundOf,
  busy,
  onLink,
  onConfirm,
  onEdit,
  onDiscard,
}: {
  capture: Capture;
  originName: string | undefined;
  ready: boolean;
  /** Lançamento que já existe e parece ser o mesmo (sugestão de vincular). */
  match: Transaction | undefined;
  /** Compra que o estorno devolve (trilha C). */
  refundOf: Transaction | undefined;
  busy: boolean;
  onLink: (tx: Transaction) => void;
  onConfirm: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  const unparsed = capture.parser === null;
  const amount = capture.amountCents ?? 0;
  // Estorno devolve dinheiro: entra com sinal +, como receita.
  const isIn = capture.kind === 'income' || capture.kind === 'card_refund';
  const signed = isIn ? amount : -amount;
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
          <MoneyText cents={signed} tone={isIn ? 'income' : 'expense'} />
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

      {match ? (
        <View className="gap-1 rounded-input bg-surface-raised p-3">
          <AppText variant="caption" tone="muted">
            {strings.pending.matchTitle}
          </AppText>
          <AppText variant="label" numberOfLines={1}>
            {`${match.description} · ${formatDateBR(match.date)}`}
          </AppText>
        </View>
      ) : null}

      {capture.kind === 'card_refund' ? (
        <View className="gap-1 rounded-input bg-surface-raised p-3">
          <AppText variant="caption" tone="muted">
            {refundOf ? strings.pending.refundOf : strings.pending.refundNoPurchase}
          </AppText>
          {refundOf ? (
            <AppText variant="label" numberOfLines={1}>
              {`${refundOf.description} · ${formatDateBR(refundOf.date)}`}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {match ? (
          <Button
            label={strings.pending.link}
            icon={Link2}
            disabled={busy}
            onPress={() => onLink(match)}
          />
        ) : null}
        {ready ? (
          <Button
            label={match ? strings.pending.createNew : strings.pending.confirm}
            icon={Check}
            variant={match ? 'secondary' : 'primary'}
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
