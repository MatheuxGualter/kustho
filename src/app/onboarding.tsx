import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha D da Fase 1.
export default function Route() {
  return (
    <RoutePlaceholder
      title={strings.screens.onboarding.title}
      description={strings.screens.onboarding.placeholder}
      track="D"
    />
  );
}
