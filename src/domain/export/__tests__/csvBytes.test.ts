import { toCsv } from '../export';

it('o CSV em UTF-8 começa com o BOM (EF BB BF) e mantém os acentos', () => {
  const csv = toCsv({ accounts: [], cards: [], categories: [], transactions: [] });
  const bytes = new TextEncoder().encode(`${csv}Alimentação`);
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(new TextDecoder('utf-8').decode(bytes)).toContain('Alimentação');
});
