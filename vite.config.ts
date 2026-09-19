import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/aerocontinuity/',
  build: {
    rollupOptions: {
      input: 'app.html',
    },
  },
  plugins: [react()],
})
