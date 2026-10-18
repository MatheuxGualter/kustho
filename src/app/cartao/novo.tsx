import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha C da Fase 1.
export default function Route() {
  return (
    <RoutePlaceholder
      title={strings.screens.newCard.title}
      description={strings.screens.newCard.placeholder}
      track="C"
    />
  );
}
