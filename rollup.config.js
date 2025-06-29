import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: {
    format: 'es',
    file: 'dist/index.js',
    exports: 'default',
  },
  plugins: [
    terser({
      compress: true,
      mangle: true,
      output: {
        comments: false,
      },
    }),
  ],
};