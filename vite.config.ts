import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  worker: {
    format: 'es',
    plugins: []
  },
  optimizeDeps: {
    exclude: ['monaco-editor']
  }
}) 