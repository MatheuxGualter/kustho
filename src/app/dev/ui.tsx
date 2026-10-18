import { Redirect } from 'expo-router';
import { Database, Eye, Inbox, Plus, Trash2 } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { clearDevData, runDevSeed } from '@/db/devSeed';
import { today } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AmountKeypad } from '@/ui/components/AmountKeypad';
import { AppText, type AppTextVariant } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { EmptyState } from '@/ui/components/EmptyState';
import { MoneyText } from '@/ui/components/MoneyText';
import { Screen } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { ThemeSelector } from '@/ui/components/ThemeSelector';
import { TransactionRow, type TransactionRowProps } from '@/ui/components/TransactionRow';
import { useTheme } from '@/ui/theme';
import { accentPalette, colorTokenNames, spacing } from '@/ui/tokens';

const typeScale: AppTextVariant[] = ['display', 'headline', 'title', 'body', 'label', 'caption'];

const sampleRows: (Omit<TransactionRowProps, 'transaction'> & {
  transaction: Partial<TransactionRowProps['transaction']>;
})[] = [
  {
    transaction: { kind: 'card_purchase', amountCents: 6890, description: 'iFood' },
    originName: 'Nubank Roxinho',
    category: { name: 'Alimentação', icon: 'utensils', color: accentPalette[3] },
  },
  {
    transaction: {
      kind: 'card_purchase',
      amountCents: 45900,
      description: 'Notebook',
      installmentNumber: 2,
      installmentTotal: 10,
    },
    originName: 'Nubank Roxinho',
    category: { name: 'Compras', icon: 'shopping-bag', color: accentPalette[4] },
  },
  {
    transaction: { kind: 'income', amountCents: 650000, description: 'Salário' },
    originName: 'Nubank',
    category: { name: 'Salário', icon: 'briefcase', color: accentPalette[5] },
  },
  {
    transaction: { kind: 'transfer', direction: 'out', amountCents: 20000, description: 'Saque' },
    originName: 'Nubank',
  },
  {
    transaction: {
      kind: 'expense',
      amountCents: 180000,
      description: 'Aluguel',
      status: 'scheduled',
    },
    originName: 'Nubank',
    category: { name: 'Moradia', icon: 'house', color: accentPalette[7] },
  },
];

const rowDefaults: TransactionRowProps['transaction'] = {
  kind: 'expense',
  amountCents: 0,
  direction: null,
  description: '',
  status: 'posted',
  installmentNumber: null,
  installmentTotal: null,
};

/** Catálogo de componentes (só em debug), para conferir os dois temas e a fonte em 130%. */
export default function DevCatalogScreen() {
  const { colors } = useTheme();
  const toggleHideValues = usePreferences((s) => s.toggleHideValues);
  const [amount, setAmount] = useState(4590);
  const [description, setDescription] = useState('');
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen edges={['bottom']}>
      <ThemeSelector />

      <DevDataSection />

      <Section title={strings.devCatalog.money}>
        <MoneyText cents={1234567} variant="display" />
        <View className="flex-row flex-wrap gap-4">
          <MoneyText cents={459000} tone="income" />
          <MoneyText cents={-4590} tone="expense" />
          <MoneyText cents={-20000} />
        </View>
        <Button
          label={strings.devCatalog.toggleHidden}
          icon={Eye}
          variant="secondary"
          onPress={toggleHideValues}
        />
      </Section>

      <Section title={strings.devCatalog.buttons}>
        <Button label={strings.devCatalog.sampleButton} block onPress={() => {}} />
        <Button label={strings.devCatalog.sampleSecondary} variant="secondary" onPress={() => {}} />
        <Button
          label={strings.tabs.newTransaction}
          icon={Plus}
          variant="ghost"
          onPress={() => {}}
        />
        <Button
          label={strings.devCatalog.sampleDanger}
          icon={Trash2}
          variant="danger"
          onPress={() => {}}
        />
        <Button label={strings.common.loading} loading onPress={() => {}} />
        <Button label={strings.common.save} disabled onPress={() => {}} />
      </Section>

      <Section title={strings.devCatalog.inputs}>
        <TextField
          label={strings.devCatalog.sampleLabel}
          placeholder={strings.devCatalog.samplePlaceholder}
          hint={strings.devCatalog.sampleHint}
          value={description}
          onChangeText={setDescription}
        />
        <TextField
          label={strings.devCatalog.sampleLabel}
          placeholder={strings.devCatalog.samplePlaceholder}
          error={strings.devCatalog.sampleError}
        />
      </Section>

      <Section title={strings.devCatalog.cards}>
        <Card onPress={() => {}} accessibilityLabel={strings.devCatalog.sampleCardTitle}>
          <AppText variant="label" tone="muted">
            {strings.devCatalog.sampleCardTitle}
          </AppText>
          <MoneyText cents={-184590} tone="expense" variant="headline" />
        </Card>
      </Section>

      <Section title={strings.devCatalog.rows} flush>
        {sampleRows.map((row, i) => (
          <TransactionRow
            key={i}
            {...row}
            transaction={{ ...rowDefaults, ...row.transaction }}
            onPress={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        ))}
      </Section>

      <Section title={strings.devCatalog.keypad}>
        <MoneyText cents={amount} variant="display" hideable={false} className="text-center" />
        <AmountKeypad value={amount} onChange={setAmount} />
      </Section>

      <Section title={strings.devCatalog.empty}>
        <EmptyState
          icon={Inbox}
          title={strings.devCatalog.sampleEmptyTitle}
          description={strings.devCatalog.sampleEmptyText}
          action={{ label: strings.tabs.newTransaction, onPress: () => {} }}
        />
      </Section>

      <Section title={strings.devCatalog.colors}>
        <View className="flex-row flex-wrap gap-2">
          {colorTokenNames.map((name) => (
            <View key={name} className="w-[30%] gap-1">
              <View
                className="h-fab rounded-input border border-border"
                style={{ backgroundColor: colors[name] }}
              />
              <AppText variant="caption">{name}</AppText>
              <AppText variant="caption" tone="muted">
                {colors[name]}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title={strings.devCatalog.accents}>
        <View className="flex-row flex-wrap gap-2">
          {accentPalette.map((color) => (
            <View
              key={color}
              className="h-fab w-fab rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </View>
      </Section>

      <Section title={strings.devCatalog.typography}>
        {typeScale.map((variant) => (
          <AppText key={variant} variant={variant} numberOfLines={1}>
            {variant === 'display'
              ? formatBRL(1234567)
              : `${variant} · ${strings.devCatalog.sample}`}
          </AppText>
        ))}
      </Section>

      <Section title={strings.devCatalog.spacing}>
        {Object.entries(spacing)
          .filter(([, value]) => value > 0)
          .map(([key, value]) => (
            <View key={key} className="flex-row items-center gap-2">
              <View className="h-2 rounded-input bg-brand" style={{ width: value * 4 }} />
              <AppText variant="caption" tone="muted">
                {value}
              </AppText>
            </View>
          ))}
      </Section>
    </Screen>
  );
}

function DevDataSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<string>) => {
    setBusy(true);
    action()
      .then(setStatus)
      .catch((e: unknown) => setStatus(String(e)))
      .finally(() => setBusy(false));
  };
  return (
    <Section title={strings.devCatalog.devData}>
      <AppText variant="caption" tone="muted">
        {strings.devCatalog.devDataHint}
      </AppText>
      <Button
        label={strings.devCatalog.seed}
        icon={Database}
        block
        loading={busy}
        onPress={() =>
          run(async () =>
            strings.devCatalog.seedDone((await runDevSeed(db, today())).transactions.length),
          )
        }
      />
      <Button
        label={strings.devCatalog.clear}
        icon={Trash2}
        variant="danger"
        block
        disabled={busy}
        onPress={() =>
          run(async () => {
            await clearDevData(db);
            return strings.devCatalog.clearDone;
          })
        }
      />
      {status ? <AppText variant="caption">{status}</AppText> : null}
    </Section>
  );
}

function Section({
  title,
  children,
  flush = false,
}: {
  title: string;
  children: ReactNode;
  /** Sem padding lateral, para linhas que vão de borda a borda. */
  flush?: boolean;
}) {
  return (
    <View
      className={`gap-3 overflow-hidden rounded-card border border-border bg-surface ${flush ? 'py-4' : 'p-4'}`}
    >
      <AppText variant="title" className={flush ? 'px-4' : ''}>
        {title}
      </AppText>
      {children}
    </View>
  );
}
