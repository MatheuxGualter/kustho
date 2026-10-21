import { router, Stack } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { Bell, FileText, Plus, Share2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';

import { DomainError, isDomainError } from '@/domain/errors';
import { errorMessage } from '@/features/shared/errorMessage';
import { strings } from '@/lib/strings';
import { useServices } from '@/services';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

import { sharedReceiptFrom, sharedReceiptText } from './sharedReceipt';
import { useReceiptReader } from './useReceiptReader';

/**
 * Recebe o que o usuário compartilhou com o Kustho (Fase 3, trilha E): lê o comprovante
 * (texto direto ou OCR de imagem/PDF no aparelho), cria a captura e abre a tela de
 * confirmação. Rota `kustho://expo-sharing`, aberta pelo `expo-sharing`.
 */
export function ReceiptShareScreen() {
  const { colors } = useTheme();
  const { captures } = useServices();
  const reader = useReceiptReader();
  const { sharedPayloads, resolvedSharedPayloads, isResolving, clearSharedPayloads } =
    useIncomingShare();
  const [failure, setFailure] = useState<string | null>(null);
  /** O Pix já tinha chegado (notificação ou outro comprovante) e foi confirmado (trilha C). */
  const [already, setAlready] = useState(false);
  /** Texto que o OCR leu: na falha, dá para enviar e ajustar o leitor a esse banco. */
  const [readText, setReadText] = useState<string | null>(null);
  /** Erro técnico (OCR, arquivo): no APK final ele some atrás de "Algo deu errado". */
  const [detail, setDetail] = useState<string | null>(null);
  const started = useRef(false);

  const payloads = resolvedSharedPayloads.length > 0 ? resolvedSharedPayloads : sharedPayloads;

  useEffect(() => {
    if (started.current || isResolving || payloads.length === 0) return;
    started.current = true;
    const read = async () => {
      const receipt = sharedReceiptFrom(payloads);
      if (!receipt) throw new DomainError('receipt_unrecognized');
      const text = await sharedReceiptText(receipt, reader);
      setReadText(text);
      if (!text.trim()) {
        clearSharedPayloads();
        setFailure(strings.receipts.noText);
        return;
      }
      const capture = await captures.ingestReceipt({ text, receivedAtMs: Date.now() });
      clearSharedPayloads();
      if (capture.status !== 'pending') {
        setAlready(true);
        return;
      }
      router.replace({ pathname: '/pendente/[id]', params: { id: capture.id } });
    };
    read().catch((e: unknown) => {
      clearSharedPayloads();
      setFailure(errorMessage(e));
      if (!isDomainError(e)) setDetail(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    });
  }, [captures, clearSharedPayloads, isResolving, payloads, reader]);

  const title = <Stack.Screen options={{ title: strings.receipts.title }} />;
  // Os itens só são limpos depois de ler (ou falhar): sem itens e sem falha, nada foi compartilhado.
  const nothingShared = !isResolving && payloads.length === 0;

  if (failure || already || nothingShared) {
    return (
      <>
        {title}
        <Screen edges={['bottom']}>
          <EmptyState
            icon={FileText}
            title={
              already
                ? strings.receipts.alreadyTitle
                : failure
                  ? strings.receipts.failedTitle
                  : strings.receipts.emptyTitle
            }
            description={already ? strings.receipts.already : (failure ?? strings.receipts.howTo)}
          />
          {failure && detail ? (
            <AppText variant="caption" tone="muted" selectable>
              {strings.receipts.technical(detail)}
            </AppText>
          ) : null}
          {failure && readText?.trim() ? (
            <>
              <AppText variant="caption" tone="muted">
                {strings.receipts.shareTextHint}
              </AppText>
              <Button
                label={strings.receipts.shareText}
                icon={Share2}
                variant="secondary"
                block
                onPress={() => void Share.share({ message: readText })}
              />
            </>
          ) : null}
          <Button
            label={strings.receipts.goPending}
            icon={Bell}
            variant="secondary"
            block
            onPress={() => router.replace('/pendentes')}
          />
          <Button
            label={strings.receipts.manual}
            icon={Plus}
            variant="ghost"
            block
            onPress={() => router.replace('/lancamento/novo')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      {title}
      <Screen edges={['bottom']}>
        <View className="items-center gap-3 py-8">
          <ActivityIndicator color={colors.brand} />
          <AppText tone="muted">{strings.receipts.reading}</AppText>
        </View>
      </Screen>
    </>
  );
}
