import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    outDir: 'dist/preload',
    lib: {
      entry: resolve(__dirname, 'src/preload/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [...builtinModules, 'electron'],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: false,
    sourcemap: true,
  },
})