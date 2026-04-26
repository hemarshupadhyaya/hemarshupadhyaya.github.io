import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/essays/shape-of-drug-development/',
  publicDir: resolve(__dirname, '../../public/data/shape-of-drug-development'),
  build: {
    outDir: resolve(__dirname, '../../essays/shape-of-drug-development'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020'
  }
});
