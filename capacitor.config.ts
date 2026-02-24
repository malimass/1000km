import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.gratitudepath.app',
  appName: '1000km di Gratitudine',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      // iOS: richiede sempre la posizione anche in background
    },
    BackgroundGeolocation: {
      backgroundMessage: 'Tracciamento GPS percorso in corso...',
      backgroundTitle: '1000km di Gratitudine',
      requestPermissions: true,
      stale: false,
      distanceFilter: 10,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
