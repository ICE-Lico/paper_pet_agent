import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键：打包后使用相对路径，不是根路径
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
