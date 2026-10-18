import { randomUUID } from 'expo-crypto';

import type { Id, Timestamp } from '@/domain/types';

/** UUID v4 gerado no aparelho; permite sincronizar no futuro sem reescrever IDs. */
export function newId(): Id {
  return randomUUID();
}

export function nowTimestamp(): Timestamp {
  return new Date().toISOString();
}
