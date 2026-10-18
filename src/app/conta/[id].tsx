import { useLocalSearchParams } from 'expo-router';

import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha A da Fase 1.
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoutePlaceholder
      title={strings.screens.account.title}
      description={strings.screens.account.placeholder}
      track="A"
      param={id}
    />
  );
}
