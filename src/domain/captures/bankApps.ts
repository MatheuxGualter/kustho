/**
 * Apps dos bancos do catálogo (`src/ui/banks/`) e os pacotes Android que postam as
 * notificações. Só entram pacotes conferidos; o usuário pode incluir outros à mão.
 */

export type BankApp = {
  /** Mesmo id do catálogo de bancos (logo e nome). */
  bankId: string;
  packageName: string;
};

export const bankApps: readonly BankApp[] = [
  { bankId: 'nubank', packageName: 'com.nu.production' },
  { bankId: 'itau', packageName: 'com.itau' },
  { bankId: 'bb', packageName: 'br.com.bb.android' },
  { bankId: 'caixa', packageName: 'br.com.gabba.Caixa' },
  { bankId: 'bradesco', packageName: 'com.bradesco' },
  { bankId: 'santander', packageName: 'com.santander.app' },
  { bankId: 'inter', packageName: 'br.com.intermedium' },
  { bankId: 'c6', packageName: 'com.c6bank.app' },
  { bankId: 'mercadopago', packageName: 'com.mercadopago.wallet' },
  { bankId: 'picpay', packageName: 'com.picpay' },
  { bankId: 'pagbank', packageName: 'br.com.uol.ps.myaccount' },
  { bankId: 'neon', packageName: 'br.com.neon' },
];

const byPackage = new Map(bankApps.map((app) => [app.packageName, app]));

export function bankAppForPackage(packageName: string): BankApp | undefined {
  return byPackage.get(packageName);
}

/** Nome de pacote Android válido (`com.banco.app`): pelo menos dois segmentos. */
export function isPackageName(text: string): boolean {
  return /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(text);
}

/** Texto digitado ("com.a, com.b  com.c") → pacotes válidos, sem repetir. */
export function parsePackageList(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).filter(isPackageName))];
}

/**
 * Pacotes sugeridos na primeira configuração: os apps dos bancos em que o usuário já tem
 * conta ou cartão (ids do catálogo).
 */
export function suggestedPackages(bankIds: readonly string[]): string[] {
  const ids = new Set(bankIds);
  return bankApps.filter((app) => ids.has(app.bankId)).map((app) => app.packageName);
}
