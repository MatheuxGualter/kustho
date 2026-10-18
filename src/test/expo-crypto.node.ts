// Substitui expo-crypto nos testes em Node (projeto "unit" do Jest).
import { randomUUID as nodeRandomUUID } from 'node:crypto';

export const randomUUID = () => nodeRandomUUID();
