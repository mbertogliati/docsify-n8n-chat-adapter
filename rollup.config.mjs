import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

const banner = `/*! @mbertogliati/docsify-n8n-chat-adapter | MIT License */`;

export default {
  input: 'src/index.js',
  // Treat any http/https imports (e.g., CDN dynamic imports) as external
  external: (id) => /^https?:\/\//.test(id),
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      banner,
    },
    {
      file: 'dist/index.umd.js',
      name: 'DocsifyN8nChatAdapter',
      format: 'umd',
      exports: 'named',
      sourcemap: true,
      banner,
    },
    {
      file: 'dist/index.umd.min.js',
      name: 'DocsifyN8nChatAdapter',
      format: 'umd',
      exports: 'named',
      sourcemap: false,
      banner,
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      preventAssignment: true,
    }),
  ],
};
