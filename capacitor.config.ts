import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.notes',
  appName: 'Lumina Notepad',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: true, allowNavigation: ['*'] }, android: { allowMixedContent: true }, plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
