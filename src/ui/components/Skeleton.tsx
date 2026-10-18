import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/ui/tokens';

const PULSE_MS = motion.slow * 4;
const MIN_OPACITY = 0.4;

/** Bloco pulsando no lugar do conteúdo que ainda carrega. */
export function Skeleton({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(MIN_OPACITY, { duration: PULSE_MS }), -1, true);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={style} importantForAccessibility="no-hide-descendants">
      <View className={`rounded-input bg-surface-raised ${className}`} />
    </Animated.View>
  );
}

/** Lista de linhas provisórias, para listas carregando. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-fab" />
      ))}
    </View>
  );
}
