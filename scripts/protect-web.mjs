// Cifra dist/index.html con la password presa da SITE_PASSWORD (secret di GitHub).
// Senza password il contenuto della pagina non è leggibile.
import { execFileSync } from 'node:child_process';

const password = process.env.SITE_PASSWORD;
if (!password || password.length < 8) {
  console.error('ERRORE: imposta SITE_PASSWORD (almeno 8 caratteri). Il sito NON viene pubblicato senza password.');
  process.exit(1);
}

// Il sale non è segreto: fisso, così «Ține-mă minte» resta valido dopo ogni aggiornamento.
const SALT = '8505e725f2a3e093f53827b469b1b168';

execFileSync('npx', [
  'staticrypt', 'dist/index.html',
  '-d', 'dist',
  '-p', password,
  '-s', SALT,
  '-c', 'false',
  '--short',
  '--remember', '30',
  '--template-title', 'MEDICARE — Autentificare',
  '--template-instructions', 'Introduceți parola pentru a deschide MEDICARE.',
  '--template-placeholder', 'Parola',
  '--template-button', 'INTRĂ',
  '--template-remember', 'Ține-mă minte (30 de zile)',
  '--template-error', 'Parolă greșită',
  '--template-toggle-show', 'Arată parola',
  '--template-toggle-hide', 'Ascunde parola',
  '--template-color-primary', '#138a36',
  '--template-color-secondary', '#f3faf4',
], { stdio: 'inherit' });

console.log('Sito cifrato ✓');
