import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha A da Fase 1.
export default function Route() {
  return (
    <RoutePlaceholder
      title={strings.screens.transfer.title}
      description={strings.screens.transfer.placeholder}
      track="A"
    />
  );
}
