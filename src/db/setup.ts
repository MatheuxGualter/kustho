import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';

import { db } from './client';
import migrations from './migrations/migrations';
import { seedDefaultCategories } from './seed';

/** Aplica as migrações pendentes e o seed inicial antes de liberar as telas. */
export function useDatabaseSetup(): { ready: boolean; error: Error | null } {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    seedDefaultCategories(db)
      .then(() => setSeeded(true))
      .catch((e: unknown) => setSeedError(e instanceof Error ? e : new Error(String(e))));
  }, [success]);

  return { ready: success && seeded, error: migrationError ?? seedError };
}
