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
} as const;
