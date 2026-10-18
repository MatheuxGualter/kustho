import { decodeOrigin, encodeOrigin } from '../origin';

it('codifica e decodifica a origem', () => {
  expect(encodeOrigin({ kind: 'card', id: 'abc-1' })).toBe('card:abc-1');
  expect(decodeOrigin('account:xyz')).toEqual({ kind: 'account', id: 'xyz' });
  expect(decodeOrigin(null)).toBeNull();
  expect(decodeOrigin('lixo')).toBeNull();
});
