import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha A da Fase 1.
export default function Route() {
  return (
    <RoutePlaceholder
      title={strings.screens.accounts.title}
      description={strings.screens.accounts.placeholder}
      track="A"
    />
  );
}
