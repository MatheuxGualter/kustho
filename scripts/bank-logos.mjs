/**
 * Gera `src/ui/banks/logos.generated.ts` a partir dos SVGs oficiais dos bancos.
 *
 * Fonte: https://github.com/Tgentil/Bancos-em-SVG (clone local). Uso:
 *   git clone --depth 1 https://github.com/Tgentil/Bancos-em-SVG /tmp/bancos-svg
 *   node scripts/bank-logos.mjs /tmp/bancos-svg
 *
 * Cada logo é otimizado com o SVGO (CSS embutido em atributos, sem metadados) e, no modo
 * `mono`, todas as cores viram a cor do primeiro plano (logo branco sobre a cor do banco).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { optimize } from 'svgo';

const source = process.argv[2];
if (!source) {
  console.error('Uso: node scripts/bank-logos.mjs <pasta do Bancos-em-SVG>');
  process.exit(1);
}

/**
 * Arquivo de cada banco, se as cores viram uma só (`mono`) ou ficam as originais, e
 * correções pontuais de arquivos que a otimização quebraria.
 */
const files = {
  nubank: ['Nu Pagamentos S.A/nubank-branco.svg', 'mono'],
  itau: ['Itaú Unibanco S.A/logo-nova-letras-brancas.svg', 'original'],
  bradesco: ['Bradesco S.A/bradesco.svg', 'original'],
  bb: ['Banco do Brasil S.A/banco-do-brasil-sem-fundo.svg', 'original'],
  caixa: ['Caixa Econômica Federal/caixa-economica-federal-X.svg', 'original'],
  santander: ['Banco Santander Brasil S.A/banco-santander-logo.svg', 'mono'],
  inter: ['Banco Inter S.A/inter.svg', 'mono'],
  c6: ['Banco C6 S.A/c6 bank.svg', 'mono'],
  btg: ['Banco BTG Pacutal/btg-pactual.svg', 'mono'],
  picpay: ['PicPay/Logo-PicPay.svg', 'mono'],
  mercadopago: ['Mercado Pago/mercado-pago.svg', 'original'],
  pagbank: ['PagSeguro Internet S.A/logo.svg', 'original'],
  neon: ['Neon/header-logo-neon.svg', 'mono'],
  sicoob: ['Sicoob/sicoob-vector-logo.svg', 'original'],
  sicredi: ['Sicredi/logo-svg2.svg', 'original'],
  pan: ['Banco Pan/bancoPan.svg', 'original'],
  original: ['Banco Original S.A/banco-original-logo-verde.svg', 'mono'],
  safra: ['Banco Safra S.A/logo-safra.svg', 'mono'],
  // O recorte (clipPath) do arquivo cobre o logo inteiro e some na otimização: removido.
  banrisul: ['Banrisul/banrisul-logo-2023.svg', 'original', 'unclip'],
  // Quadrado preto com o "xp" vazado: em branco sobre fundo preto.
  xp: ['XP Investimentos/xp-investimentos-logo.svg', 'mono'],
};

const MONO = 'currentColor';

/** Plugin do SVGO: troca toda cor de preenchimento e contorno pela cor do primeiro plano. */
const monochrome = {
  name: 'monochrome',
  fn: () => ({
    element: {
      enter: (node, parent) => {
        for (const attr of ['fill', 'stroke', 'stop-color']) {
          const value = node.attributes[attr];
          if (value && value !== 'none') node.attributes[attr] = MONO;
        }
        // Sem fill explícito, o SVG pinta de preto: força a cor na raiz.
        if (node.name === 'svg' && parent.type === 'root' && !node.attributes.fill) {
          node.attributes.fill = MONO;
        }
      },
    },
  }),
};

/** Plugin do SVGO: remove recortes (`clipPath`) e as referências a eles. */
const unclip = {
  name: 'unclip',
  fn: () => ({
    element: {
      enter: (node, parent) => {
        if (node.name === 'clipPath') {
          parent.children = parent.children.filter((child) => child !== node);
          return;
        }
        delete node.attributes['clip-path'];
      },
    },
  }),
};

const out = {};
for (const [id, [file, mode, fix]] of Object.entries(files)) {
  const raw = readFileSync(join(source, file), 'utf8');
  const { data } = optimize(raw, {
    multipass: true,
    floatPrecision: 2,
    plugins: [
      ...(fix === 'unclip' ? [unclip] : []),
      'preset-default',
      'removeDimensions',
      { name: 'inlineStyles', params: { onlyMatchedOnce: false } },
      'convertStyleToAttrs',
      ...(mode === 'mono' ? [monochrome] : []),
    ],
  });
  out[id] = data;
  console.log(`${id.padEnd(12)} ${mode.padEnd(8)} ${raw.length} → ${data.length} bytes`);
}

const body = Object.entries(out)
  .map(([id, xml]) => `  ${id}: ${JSON.stringify(xml)},`)
  .join('\n');

writeFileSync(
  new URL('../src/ui/banks/logos.generated.ts', import.meta.url),
  `// Gerado por scripts/bank-logos.mjs — não edite à mão.\n` +
    `// Logos oficiais dos bancos (marcas de seus titulares), via github.com/Tgentil/Bancos-em-SVG.\n\n` +
    `export const bankLogoXml = {\n${body}\n} as const;\n\n` +
    `export type BankId = keyof typeof bankLogoXml;\n`,
);
