import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Registered test identity; store release will use its own signing certificate.
  appId: process.env.FINANCAS10_BUILD_TARGET === 'release' ? 'io.github.wbsantiago.financas10' : 'io.github.wbsantiago.financas10.preview',
  appName: process.env.FINANCAS10_BUILD_TARGET === 'release' ? 'Finanças10' : 'Finanças10 Teste',
  webDir: 'dist-native',
  backgroundColor: '#0d141c',
  loggingBehavior: 'none',
  server: { androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_reminder', iconColor: '#4e78ad' },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DARK' },
  },
};

export default config;
