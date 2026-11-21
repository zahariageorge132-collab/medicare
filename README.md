# MEDICARE — promemoria pastiglie per tablet Android

App React + TypeScript + Capacitor. Interfaccia interamente in rumeno, pensata per una persona
anziana con Parkinson: il tablet mostra solo orologio e stato; all'ora della dose suona,
riproduce in ciclo il messaggio vocale di un familiare e mostra un enorme pulsante verde.

## Funzioni

- **Schermata principale**: orologio grande (fuso Europe/Rome), data, «TOTUL ESTE ÎN REGULĂ ❤️»,
  prossima dose (oggi o «mâine»).
- **Allarme**: «ESTE TIMPUL SĂ ÎȚI IEI MEDICAMENTELE!», ora della dose, pulsante
  «AM LUAT PASTILELE ✓» (92% di larghezza, alto almeno 140 px o il 28% dello schermo).
  Il pulsante si attiva 1,5 s dopo la comparsa, per evitare conferme involontarie.
- **Audio**: suono di avviso → messaggio vocale → pausa di 2 s → ripete, finché non si preme.
  Volume portato al massimo durante l'allarme (disattivabile), poi ripristinato.
- **Conferma**: «FOARTE BINE! ❤️ — Ai luat pastilele la ora 14:03.» per 5 s, poi torna alla home.
- **Dosi predefinite**: 08:00, 11:00, 14:00, 17:00, ogni giorno. Nessun dosaggio o quantità.
- **Dose non confermata**: resta in allarme fino alla dose successiva, a mezzanotte o dopo
  la durata massima (predefinita 120 min, 0 = senza limite); poi viene segnata «Neconfirmată».
  Se il tablet resta spento, al riavvio le dosi perse vengono registrate come non confermate.
- **Pannello familiare** (5 tocchi rapidi sull'orologio → PIN, predefinito **1234**):
  orari (fino a 8 dosi), registrazione o caricamento del messaggio vocale, test dell'allarme,
  storico ultimi 14 giorni con ritardi, cambio PIN, blocco/sblocco dello schermo.
  Si chiude da solo dopo 3 minuti senza attività.
- **Android**: schermo sempre acceso, schermo intero, tasto Indietro disattivato, app registrata
  come «Home» (si apre da sola all'accensione), kiosk con `startLockTask`, notifiche
  giornaliere di riserva se l'app venisse chiusa.

## Struttura

```
src/
  i18n.ts          tutti i testi in rumeno (modificare solo qui)
  time.ts          ora di Roma, date in rumeno
  schedule.ts      logica: dose attiva, prossima dose, dosi perse
  storage.ts       impostazioni/storico (localStorage), voce (IndexedDB)
  audio.ts         ciclo audio dell'allarme
  native.ts        ponte verso Android + notifiche di riserva
  App.tsx          macchina a stati delle schermate
  components/      Home, AlarmScreen, Confirmed, PinPad, Admin
public/alarm.wav   suono di avviso (copiato anche in android/.../res/raw)
android/app/src/main/java/ro/medicare/app/
  MainActivity.java          schermo acceso, schermo intero, Indietro bloccato, autoplay audio
  MedicarePlugin.java        volume massimo, avvio/arresto kiosk
  MedicareAdminReceiver.java solo per il kiosk completo (Device Owner)
```

## Prova nel browser

```bash
npm install
npm run dev
```
Per provare l'allarme: pannello (5 tocchi sull'orologio, PIN 1234) → «Testează alarma acum».
Nel browser, la prima riproduzione audio può richiedere un tocco sulla pagina: sul tablet no.

## Creare l'APK

Requisiti: Node 20+, Android Studio (con JDK 21 incluso). Il tablet deve avere **Android 7.0 o superiore**.

```bash
npm install
npm run build
npx cap sync android
npx cap open android      # apre Android Studio
```
In Android Studio: *Build → Build App Bundle(s) / APK(s) → Build APK(s)*, poi installa l'APK sul tablet
(oppure collega il tablet via USB con il debug USB attivo e premi ▶ Run).

Ogni volta che modifichi il codice in `src/`: `npm run build && npx cap sync android`.

## Configurazione del tablet (una volta sola)

1. **Fuso orario**: Impostazioni → Data e ora → Europe/Rome (l'app usa comunque Roma,
   ma le notifiche di riserva usano l'ora del tablet).
2. **Sempre in carica**: lo schermo resta acceso tutto il giorno.
3. Apri MEDICARE, concedi **notifiche** e **microfono**.
4. Premi il tasto Home → scegli **MEDICARE** → **Sempre**. Così all'accensione parte da sola.
5. Impostazioni → Batteria → MEDICARE → **Nessuna restrizione / Non ottimizzare**.
6. Nel pannello, registra il messaggio vocale e **cambia il PIN**.
7. Blocco schermo del tablet: impostalo su **Nessuno**.

### Kiosk: due livelli

**Livello base (nessun PC necessario)** — attiva *Impostazioni → Sicurezza → Blocco app su schermo
(Fissa schermo / Screen pinning)*, poi nel pannello premi «Blochează ecranul pe aplicație»
e conferma. Per uscire servono i tasti Indietro + Panoramica tenuti premuti insieme
(o «Deblochează ecranul» dal pannello).

**Livello completo (consigliato)** — l'app diventa *Device Owner*: nessuna conferma, nessun modo
di uscire senza PIN. Richiede un tablet **senza account Google** configurati (rimuovili prima o fai un reset):

```bash
adb shell dpm set-device-owner ro.medicare.app/.MedicareAdminReceiver
```
Poi nel pannello premi «Blochează ecranul pe aplicație» (comparirà «Device Owner ✓»).
Per rimuoverlo in futuro: dal pannello «Deblochează ecranul», poi
Impostazioni → Sicurezza → App di amministrazione dispositivo, oppure un reset di fabbrica.

## Limiti da sapere

- L'allarme completo (voce in ciclo + schermata) funziona quando MEDICARE è in primo piano,
  che è proprio lo scopo del kiosk. Se l'app venisse chiusa, suona solo la notifica di riserva;
  toccandola si apre l'app che mostra subito l'allarme.
- Non ho potuto compilare l'APK nel mio ambiente (manca l'SDK Android): la parte web
  è compilata e testata, la parte Java va verificata alla prima build in Android Studio.
- I dati restano solo sul tablet: nessun server, nessun account.
