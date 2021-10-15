exports.build = (production, watch) => {
  require('esbuild')
    .build({
      platform: 'node',
      target: 'node10.12',
      mainFields: ['main', 'module'],
      watch,
      minify: production,
      sourcemap: !production,
      entryPoints: ['./src/index.ts'],
      bundle: true,
      external: ['coc.nvim'],
      outfile: 'lib/index.js',
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
};

if (require.main === module) {
  exports.build(true, false);
  // eslint-disable-next-line no-console
  console.log('build done');
}
