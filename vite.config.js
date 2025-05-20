import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000
  }
}) 