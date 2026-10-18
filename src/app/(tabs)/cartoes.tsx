import { strings } from '@/lib/strings';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

export default function CardsScreen() {
  return (
    <Screen title={strings.screens.cards.title}>
      <Placeholder description={strings.screens.cards.placeholder} />
    </Screen>
  );
}
