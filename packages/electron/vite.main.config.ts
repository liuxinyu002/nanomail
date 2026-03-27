import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [...builtinModules, 'electron', 'better-sqlite3', 'bcryptjs'],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: false,
    sourcemap: true,
  },
})