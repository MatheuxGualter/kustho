import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha A da Fase 1.
export default function Route() {
  return (
    <RoutePlaceholder
      title={strings.screens.newAccount.title}
      description={strings.screens.newAccount.placeholder}
      track="A"
    />
  );
}
