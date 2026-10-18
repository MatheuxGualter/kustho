import { useLocalSearchParams } from 'expo-router';

import { RoutePlaceholder } from '@/features/shared/RoutePlaceholder';
import { strings } from '@/lib/strings';

// Trilha C da Fase 1.
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoutePlaceholder
      title={strings.screens.invoice.title}
      description={strings.screens.invoice.placeholder}
      track="C"
      param={id}
    />
  );
}
