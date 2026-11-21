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

## Controllo a distanza (bot Telegram) e foto

Dal telefono, in Telegram, puoi:

| Comando | Cosa fa |
|---|---|
| `/stare` | stato di adesso: allarme attivo, dosi di oggi, prossima dose |
| `/istoric` | ultimi 7 giorni |
| `/ore` | mostra gli orari |
| `/ore 08:00 11:00 14:00 17:00` | cambia gli orari (accetta anche `8`, `12.30`, `1800`) |
| `/foto` | scatta una foto con la fotocamera del tablet e te la manda |
| `/video` | il tablet entra in una videochiamata; ti arriva il link, lo apri e vi vedete/sentite |
| `/stopvideo` | chiude la videochiamata |
| `/test` | fa partire un allarme di prova sul tablet |

Avvisi automatici:
- ✅ dose confermata (disattivabile)
- ⏰ l'allarme suona da X minuti senza conferma (predefinito 15, 0 = mai)
- ❌ dose non confermata
- ℹ️ MEDICARE riavviata (es. dopo un riavvio del tablet)

I messaggi non inviati per mancanza di rete vengono rimandati quando torna la connessione.

**Videochiamata:** con `/video` il tablet entra da solo in una stanza di Jitsi Meet (gratuito, nessun
server) e ti manda il link; tu lo apri sul telefono e vedi/senti la persona. Sul tablet NON compare
l'interfaccia della chiamata: resta l'orologio, con in alto l'avviso «📹 Videoconvorbire cu familia»
per tutta la durata, e la persona sente la tua voce dall'altoparlante. La chiamata si chiude da sola
dopo 15 minuti, con `/stopvideo`, o quando chiudi tu dal telefono.

**Privacy:** la fotocamera si accende solo per lo scatto (circa 2 secondi) e per tutto quel tempo
in alto sullo schermo compare «📷 Se face o fotografie pentru familie». Le foto non vengono salvate
sul tablet: vanno solo nella chat Telegram di chi è abbinato.

### Configurazione

1. In Telegram apri **@BotFather** → `/newbot` → scegli nome e username → copia il **token**.
2. Sul tablet: pannello (5 tocchi sull'orologio + PIN) → «Control de la distanță» → incolla il token → «Conectează».
   Deve comparire «Conectat ✓ @nomebot».
3. Dal tuo telefono apri il bot e scrivi `/start PIN` (il PIN del pannello). Ogni familiare fa lo stesso.
   Le persone abbinate compaiono nel pannello e si possono rimuovere.
4. Premi «Fă o fotografie de test»: la prima volta Android chiede il permesso per la fotocamera → **Consenti**.

Chi non si è abbinato con il PIN riceve solo «Nu sunteți autorizat». Il tablet ha bisogno di internet (Wi-Fi).
I testi del bot sono in rumeno come il resto dell'app: si cambiano in `src/i18n.ts` (sezione `bot`).

## Struttura

```
src/
  i18n.ts          tutti i testi in rumeno (modificare solo qui)
  time.ts          ora di Roma, date in rumeno
  schedule.ts      logica: dose attiva, prossima dose, dosi perse
  storage.ts       impostazioni/storico (localStorage), voce (IndexedDB)
  audio.ts         ciclo audio dell'allarme
  native.ts        ponte verso Android + notifiche di riserva
  telegram.ts      client Bot API (long polling, invio, coda offline)
  botCommands.ts   comandi /stare /istoric /ore /foto /test e abbinamento /start PIN
  camera.ts        scatto di una singola foto
  videocall.ts     videochiamata Jitsi (il tablet entra da solo, schermo resta sull'orologio)
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

## Sito (GitHub Pages)

A ogni push su `main` la versione web viene pubblicata da sola su
https://zahariageorge132-collab.github.io/medicare/
(serve una volta: Settings → Pages → Source: **GitHub Actions**).

Il sito è **protetto da password**: la pagina viene cifrata (AES, con
[StatiCrypt](https://github.com/robinmoisson/staticrypt)) e senza password non si vede niente.
La password non è nel codice: è il secret **`SITE_PASSWORD`** del repository
(Settings → Secrets and variables → Actions → New repository secret, almeno 8 caratteri).
Se il secret manca, la pubblicazione si ferma invece di mettere online un sito aperto.
Per cambiare password: modifica il secret e rilancia l'azione «Pubblica sito».

L'app sul tablet non ha login (comando `npm run build`, senza cifratura).

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
- Il bot funziona quando MEDICARE è aperta (cioè sempre, con il kiosk) e il tablet ha internet.
- Nella versione web (sito di prova) il bot, la fotocamera e la videochiamata non funzionano: serve l'app Android.
  (Nell'anteprima su claude.ai la videochiamata è bloccata; sul sito GitHub Pages e sull'app Android funziona.)
- Non ho potuto compilare l'APK nel mio ambiente (manca l'SDK Android): la parte web
  è compilata e testata, la parte Java va verificata alla prima build in Android Studio.
- I dati restano solo sul tablet: nessun server, nessun account.
