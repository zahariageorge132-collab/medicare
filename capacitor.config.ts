import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ro.medicare.app',
  appName: 'MEDICARE',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#138A36',
      sound: 'alarm.wav',
    },
  },
};

export default config;
