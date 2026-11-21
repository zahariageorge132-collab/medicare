// Tutti i testi visibili dell'app, in rumeno semplice.
// Per modificare un testo, cambialo solo qui.

export const T = {
  // Schermata principale
  allOk: 'TOTUL ESTE ÎN REGULĂ ❤️',
  nextDoseToday: (ora: string) => `Următoarea doză este la ora ${ora}`,
  nextDoseTomorrow: (ora: string) => `Următoarea doză este mâine la ora ${ora}`,
  noDoses: 'Nu este programată nicio doză',

  // Allarme
  alarmTitle: 'ESTE TIMPUL SĂ ÎȚI IEI MEDICAMENTELE!',
  alarmTime: (ora: string) => `Ora ${ora}`,
  alarmButton: 'AM LUAT PASTILELE ✓',
  testAlarm: 'TEST',

  // Conferma
  confirmTitle: 'FOARTE BINE! ❤️',
  confirmText: (ora: string) => `Ai luat pastilele la ora ${ora}.`,

  // Nomi delle dosi
  doseNames: [
    'Prima doză',
    'A doua doză',
    'A treia doză',
    'A patra doză',
    'A cincea doză',
    'A șasea doză',
    'A șaptea doză',
    'A opta doză',
  ],

  // Giorni e mesi
  days: ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'],
  months: [
    'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
  ],

  // PIN
  pinTitle: 'Introduceți codul PIN',
  pinWrong: 'Cod PIN greșit',
  pinCancel: 'Înapoi',
  pinDelete: 'Șterge',

  // Pannello amministratore
  adminTitle: 'Setări (pentru familie)',
  adminClose: 'Închide setările',
  secDoses: 'Orele medicamentelor',
  doseAdd: '+ Adaugă o doză',
  doseRemove: 'Elimină',
  save: 'Salvează',
  saved: 'Salvat ✓',
  dosesInvalid: 'Două doze nu pot avea aceeași oră.',

  secVoice: 'Mesajul vocal',
  voiceNone: 'Nu există niciun mesaj înregistrat. Se va auzi doar sunetul de alarmă.',
  voicePresent: 'Mesajul vocal este salvat.',
  voiceRecord: '● Înregistrează',
  voiceStop: '■ Oprește înregistrarea',
  voicePlay: '▶ Ascultă',
  voiceUpload: 'Alege un fișier audio',
  voiceDelete: 'Șterge mesajul',
  voiceRecording: 'Se înregistrează… vorbiți acum.',
  voiceMicError: 'Microfonul nu poate fi folosit. Verificați permisiunile aplicației.',

  secAlarm: 'Alarma',
  maxVolume: 'Pune volumul la maxim când sună alarma',
  maxDuration: 'Oprește alarma după (minute, 0 = niciodată)',
  testButton: 'Testează alarma acum',

  secHistory: 'Istoric (ultimele 14 zile)',
  histDate: 'Data',
  histDose: 'Doza',
  histPlanned: 'Ora',
  histStatus: 'Stare',
  histTaken: (ora: string, delay: number) =>
    delay > 0 ? `✓ Luată la ${ora} (după ${delay} min)` : `✓ Luată la ${ora}`,
  histMissed: '✗ Neconfirmată',
  histEmpty: 'Nu există încă înregistrări.',

  secPin: 'Cod PIN',
  pinDefaultWarn: 'Atenție: folosiți încă PIN-ul inițial 1234. Schimbați-l!',
  pinNew: 'PIN nou (4–8 cifre)',
  pinChange: 'Schimbă PIN-ul',
  pinChanged: 'PIN schimbat ✓',
  pinInvalid: 'PIN-ul trebuie să aibă între 4 și 8 cifre.',

  secKiosk: 'Blocarea ecranului',
  kioskOn: 'Blochează ecranul pe aplicație',
  kioskOff: 'Deblochează ecranul',
  kioskInfo:
    'Când ecranul este blocat, pacientul nu poate ieși din aplicație.',
  kioskWebOnly: 'Disponibil doar pe tabletă (aplicația Android).',
  // Banner visibile sul tablet mentre la fotocamera è accesa
  cameraBanner: '📷 Se face o fotografie pentru familie',

  // Pannello: controllo da distanță
  secRemote: 'Control de la distanță (Telegram)',
  tgToken: 'Token-ul botului (de la @BotFather)',
  tgSave: 'Conectează',
  tgDisconnect: 'Deconectează',
  tgStateOff: 'Neconectat',
  tgStateConnecting: 'Se conectează…',
  tgStateOk: (u: string) => `Conectat ✓  @${u}`,
  tgStateError: (m: string) => `Eroare: ${m}`,
  tgPairHelp: (pin: string) =>
    `Pentru a primi mesaje, deschideți botul în Telegram și trimiteți: /start ${pin}`,
  tgChats: 'Persoane conectate',
  tgNoChats: 'Nicio persoană conectată încă.',
  tgAlertAfter: 'Trimite avertizare dacă alarma sună de (minute, 0 = niciodată)',
  tgNotifyConfirm: 'Trimite mesaj la fiecare confirmare',
  tgCamera: 'Camera pentru fotografii',
  tgCameraFront: 'Frontală (spre pacient)',
  tgCameraBack: 'Din spate',
  tgTestMsg: 'Trimite mesaj de test',
  tgTestPhoto: 'Fă o fotografie de test',
  tgSent: 'Trimis ✓',
  tgFailed: 'Nu s-a putut trimite',

  // Messaggi del bot (Telegram)
  bot: {
    commands: [
      { command: 'stare', description: 'Starea de acum' },
      { command: 'istoric', description: 'Istoricul ultimelor 7 zile' },
      { command: 'ore', description: 'Orele medicamentelor (și modificare)' },
      { command: 'foto', description: 'O fotografie de pe tabletă' },
      { command: 'test', description: 'Pornește o alarmă de test' },
      { command: 'ajutor', description: 'Lista comenzilor' },
    ],
    help:
      'MEDICARE — comenzi:\n' +
      '/stare — starea de acum\n' +
      '/istoric — ultimele 7 zile\n' +
      '/ore — orele medicamentelor\n' +
      '/ore 08:00 11:00 14:00 17:00 — schimbă orele\n' +
      '/foto — fă o fotografie\n' +
      '/test — alarmă de test pe tabletă\n\n' +
      'Primiți automat un mesaj dacă o doză nu este confirmată.',
    unauthorized: 'Nu sunteți autorizat. Trimiteți: /start PIN (PIN-ul din setările tabletei).',
    wrongPin: 'Cod PIN greșit.',
    paired: (name: string) => `Bun venit, ${name}! Acum veți primi mesajele MEDICARE.`,
    started: 'ℹ️ MEDICARE a pornit pe tabletă.',
    test: 'Mesaj de test de la MEDICARE ✓',
    confirmed: (label: string, time: string, at: string, delay: number) =>
      `✅ ${label} (${time}) — confirmată la ${at}` + (delay > 0 ? ` (după ${delay} min)` : ''),
    ringing: (label: string, time: string, min: number) =>
      `⏰ Alarma pentru ${label} (${time}) sună de ${min} minute și nu a fost încă confirmată.`,
    missed: (label: string, time: string) => `❌ ${label} (${time}) NU a fost confirmată.`,
    statusHeader: (date: string, time: string) => `📋 Stare — ${date}, ora ${time}`,
    statusRinging: (label: string, time: string, min: number) =>
      `🔔 Alarma sună acum: ${label} (${time}), de ${min} min`,
    statusOk: '✅ Nicio alarmă activă',
    statusNext: (t: string, tomorrow: boolean) => `Următoarea doză: ${tomorrow ? 'mâine ' : ''}la ${t}`,
    statusToday: 'Azi:',
    doseTaken: (at: string) => `✓ luată la ${at}`,
    doseMissed: '✗ neconfirmată',
    dosePending: '… urmează',
    doseRinging: '🔔 sună acum',
    historyHeader: '🗓 Istoric — ultimele 7 zile',
    historyEmpty: 'Nu există încă înregistrări.',
    hoursList: (list: string) => `🕗 Orele medicamentelor: ${list}\nPentru a le schimba: /ore 08:00 11:00 14:00 17:00`,
    hoursSaved: (list: string) => `✅ Orele noi: ${list}`,
    hoursInvalid: 'Format greșit. Exemplu: /ore 08:00 11:00 14:00 17:00 (între 1 și 8 ore diferite).',
    testStarted: '🔔 Alarma de test a pornit pe tabletă.',
    photoTaking: '📷 Fac fotografia…',
    photoCaption: (date: string, time: string) => `📷 ${date}, ora ${time}`,
    photoError: 'Nu am putut face fotografia (camera nu este disponibilă sau permisiunea lipsește).',
  },
} as const;
