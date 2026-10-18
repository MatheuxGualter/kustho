module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Migrações do Drizzle são arquivos .sql importados como texto.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
