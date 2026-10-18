import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha D da Fase 1.
export default function Route() {
  return (
    <RoutePlaceholder
      title={strings.screens.settings.title}
      description={strings.screens.settings.placeholder}
      track="D"
    />
  );
}
