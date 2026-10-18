import type { Category } from '@/domain/types';

import { isNameTaken } from '../rules';

const cat = (
  name: string,
  kind: Category['kind'],
  id = name,
): Pick<Category, 'id' | 'name' | 'kind'> => ({
  id,
  name,
  kind,
});

describe('isNameTaken', () => {
  const list = [cat('Mercado', 'expense'), cat('Outros', 'income')];

  it('mesmo nome e tipo, ignorando maiúsculas, acentos e espaços', () => {
    expect(isNameTaken(list, ' mercádo ', 'expense')).toBe(true);
  });

  it('mesmo nome em outro tipo é permitido', () => {
    expect(isNameTaken(list, 'Outros', 'expense')).toBe(false);
  });

  it('ao editar, a própria categoria não conta', () => {
    expect(isNameTaken(list, 'Mercado', 'expense', 'Mercado')).toBe(false);
  });
});
