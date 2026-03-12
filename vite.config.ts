import path from 'path'
import tailwindcss from '@tailwindcss/postcss'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/presizion/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
})
