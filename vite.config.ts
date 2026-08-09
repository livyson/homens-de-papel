import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Necessário para GitHub Pages em https://livyson.github.io/homens-de-papel/
  base: '/homens-de-papel/',
  plugins: [react()],
})
