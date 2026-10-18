import { useLocalSearchParams } from 'expo-router';

import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha D da Fase 1.
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoutePlaceholder
      title={strings.screens.category.title}
      description={strings.screens.category.placeholder}
      track="D"
      param={id}
    />
  );
}
