import { defineConfig } from 'vite';
import path from 'node:path';
import terser from '@rollup/plugin-terser';

// Vite library build configuration
// Produces:
// - dist/index.esm.js (ESM)
// - dist/index.umd.js (UMD, non-minified)
// - dist/index.umd.min.js (UMD, minified)
// Note: We configure multiple Rollup outputs to generate both .js and .min.js for UMD.
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'DocsifyN8nChatAdapter',
      // formats are controlled via rollupOptions.output below
      fileName: (format) => {
        if (format === 'es') return 'index.esm.js';
        // default UMD non-minified
        return 'index.umd.js';
      },
    },
    sourcemap: true,
    rollupOptions: {
      output: [
        // ESM
        {
          format: 'es',
          entryFileNames: 'index.esm.js',
          exports: 'named',
        },
        // UMD (non-minified)
        {
          format: 'umd',
          name: 'DocsifyN8nChatAdapter',
          entryFileNames: 'index.umd.js',
          exports: 'named',
        },
        // UMD (minified)
        {
          format: 'umd',
          name: 'DocsifyN8nChatAdapter',
          entryFileNames: 'index.umd.min.js',
          exports: 'named',
          plugins: [
            // use terser for .min.js output
            terser(),
          ],
        },
      ],
    },
  },
});
