import { useLocalSearchParams } from 'expo-router';

import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={['bottom']}>
      <Placeholder description={`${strings.screens.editTransaction.title} · ${id}`} />
    </Screen>
  );
}
