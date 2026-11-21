import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base './' perché Capacitor carica i file in locale.
// plugin-legacy: genera anche una versione compatibile con i browser vecchi
// (es. la WebView di Android 6), che è la causa tipica della "pagina bianca".
// mode "web" (sito GitHub Pages): tutto in un solo file, poi cifrato con password.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins:
    mode === 'web'
      ? [react(), viteSingleFile()]
      : [
          react(),
          legacy({
            targets: ['Android >= 6', 'Chrome >= 44'],
            additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
          }),
        ],
  build: { target: 'es2017' },
}))
