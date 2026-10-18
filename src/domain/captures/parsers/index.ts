/**
 * Parsers registrados (trilha C). Os de banco vêm primeiro, cada um com os seus pacotes; o
 * genérico (sem pacotes) é a reserva. Para incluir um banco: crie `<banco>.ts`, as fixtures
 * reais anonimizadas em `__fixtures__/<banco>.json` e registre aqui.
 */
import type { NotificationParser } from '@/domain/contracts';

import { genericParser } from './generic';

export const parsers: readonly NotificationParser[] = [genericParser];
