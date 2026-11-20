import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const native = mode === 'native';
  const release = process.env.FINANCAS10_BUILD_TARGET === 'release';
  const androidVersion = fs.readFileSync(path.resolve(__dirname, 'android/app/build.gradle'), 'utf8').match(/versionName "([^"]+)"/)?.[1] || '';
  const nativeConfigPath = path.resolve(__dirname, `android/app/src/${release ? 'release' : 'debug'}/google-services.json`);
  let nativeAuthReady = false;
  if (native && fs.existsSync(nativeConfigPath)) {
    const config = JSON.parse(fs.readFileSync(nativeConfigPath, 'utf8'));
    const webConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8'));
    const client = config.client?.find((entry: any) => entry.client_info?.android_client_info?.package_name === `io.github.wbsantiago.financas10${release ? '' : '.preview'}`);
    if (config.project_info?.project_id !== webConfig.projectId || !client || !client.oauth_client?.some((entry: any) => entry.client_type === 3)) {
      throw new Error('Configuração Android incompatível: use o mesmo projeto Firebase, pacote e cliente OAuth Google da aplicação web.');
    }
    nativeAuthReady = true;
  }
  return {
    define: {
      'import.meta.env.VITE_NATIVE_AUTH_READY': JSON.stringify(String(nativeAuthReady)),
      'import.meta.env.VITE_NATIVE_RELEASE': JSON.stringify(String(release)),
      'import.meta.env.VITE_ANDROID_VERSION': JSON.stringify(androidVersion),
    },
    plugins: [react(), tailwindcss(), ...native ? [] : [VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Mês de Boa — Planejamento financeiro',
        short_name: 'Mês de Boa',
        description: 'Organize entradas, despesas e limites do seu planejamento financeiro.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0d141c',
        theme_color: '#0d141c',
        icons: [
          { src: '/icons/app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/app-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'financas10-shell',
        globPatterns: ['index.html', 'assets/*.{js,css}', 'fonts/*.ttf', 'icons/*.png', 'favicon.svg', 'brand-mark.svg'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
        // Only app navigation: never replace OAuth callbacks, API responses or files.
        navigateFallbackAllowlist: [/^\/(?:index\.html)?(?:\?.*)?$/],
        // Financial records, Firebase responses and third-party content are not cached here.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    })]],
    build: { outDir: native ? 'dist-native' : 'dist', rollupOptions: { input: {
      app: path.resolve(__dirname, 'index.html'),
      privacy: path.resolve(__dirname, 'privacidade.html'),
      deletion: path.resolve(__dirname, 'excluir-conta.html'),
    } } },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
