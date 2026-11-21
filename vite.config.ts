import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base './' perché Capacitor carica i file in locale.
// target es2017: compatibile anche con WebView di tablet vecchi.
// mode "web" (sito GitHub Pages): tutto in un solo index.html, che poi viene cifrato con password.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'web' ? [react(), viteSingleFile()] : [react()],
  build: { target: 'es2017' },
}))
