import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' perché Capacitor carica i file in locale.
// target es2017: compatibile anche con WebView di tablet vecchi.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2017' },
})
