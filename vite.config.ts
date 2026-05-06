import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    allowedHosts: ['localhost', 'admin.wlplay.cn'],
    proxy: {
      '/api': 'http://127.0.0.1:3010',
    },
  },
})
