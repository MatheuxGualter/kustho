import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

export default function TransactionsScreen() {
  return (
    <Screen title={strings.screens.transactions.title}>
      <Placeholder description={strings.screens.transactions.placeholder} />
    </Screen>
  );
}
