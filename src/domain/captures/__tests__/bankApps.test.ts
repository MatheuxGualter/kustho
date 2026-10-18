import { banks } from '@/ui/banks/banks';

import {
  bankAppForPackage,
  bankApps,
  isPackageName,
  parsePackageList,
  suggestedPackages,
} from '../bankApps';

describe('bankApps', () => {
  it('só usa bancos do catálogo e não repete pacote', () => {
    const ids = new Set(banks.map((b) => b.id as string));
    for (const app of bankApps) expect(ids.has(app.bankId)).toBe(true);
    const packages = bankApps.map((a) => a.packageName);
    expect(new Set(packages).size).toBe(packages.length);
    expect(packages.every(isPackageName)).toBe(true);
  });

  it('acha o banco pelo pacote', () => {
    expect(bankAppForPackage('com.nu.production')?.bankId).toBe('nubank');
    expect(bankAppForPackage('com.desconhecido')).toBeUndefined();
  });

  it('sugere os apps dos bancos onde o usuário tem conta', () => {
    expect(suggestedPackages(['nubank', 'inter', 'xp'])).toEqual([
      'com.nu.production',
      'br.com.intermedium',
    ]);
  });
});

describe('pacotes digitados', () => {
  it.each(['com.nu.production', 'br.com.gabba.Caixa', 'a.b'])('%s é pacote', (text) => {
    expect(isPackageName(text)).toBe(true);
  });

  it.each(['nubank', 'com.', '.com.x', 'com..x', '1com.x', 'com.x y'])('%s não é', (text) => {
    expect(isPackageName(text)).toBe(false);
  });

  it('separa por vírgula ou espaço, ignora inválidos e repetidos', () => {
    expect(parsePackageList(' com.a.b, com.c.d;com.a.b  lixo ')).toEqual(['com.a.b', 'com.c.d']);
  });
});
