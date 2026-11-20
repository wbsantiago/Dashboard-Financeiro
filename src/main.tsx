import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './sereno.css';
import './mobile.css';
import { bootstrapNativeStorage } from './utils/nativePersistence';
import { importDataFromJSON } from './utils/storage';
import { StartupRecovery } from './components/StartupRecovery';
import { finishCloudCacheCleanup } from './utils/accountDeletion';
import { db } from './utils/firebase';

const root = createRoot(document.getElementById('root')!);
async function start() {
  try {
    if (await finishCloudCacheCleanup(db)) { window.location.reload(); return; }
  } catch {
    root.render(<main className="legal-page"><h1>Concluir limpeza do cache da conta</h1><p>Feche outras janelas do aplicativo e tente novamente. Sua cópia financeira local permanece preservada.</p><button onClick={() => void start()}>Tentar novamente</button></main>);
    return;
  }
  try {
    await bootstrapNativeStorage(importDataFromJSON);
    root.render(<StrictMode><App /></StrictMode>);
  } catch {
    root.render(<StartupRecovery onRetry={start} />);
  }
}
void start();
