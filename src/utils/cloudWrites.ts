import { setDoc as sdkSetDoc, deleteDoc as sdkDeleteDoc, writeBatch as sdkWriteBatch, runTransaction as sdkRunTransaction } from 'firebase/firestore';

let online = typeof navigator === 'undefined' || navigator.onLine !== false;
let ready = true;
let nativeProbe = false;
export function setCloudConnection(connected: boolean, native = false) { online = connected; nativeProbe = native; }
export function setCloudWriteReady(value: boolean) { ready = value; }
export function assertCloudWritable() {
  if (!online || (!nativeProbe && typeof navigator !== 'undefined' && navigator.onLine === false)) throw new Error('Sem internet. Você pode consultar os dados já carregados; conecte-se para alterar a conta.');
  if (!ready) throw new Error('Aguarde o carregamento da conta antes de salvar.');
}
export const setDoc: typeof sdkSetDoc = ((...args: any[]) => {
  try { assertCloudWritable(); return (sdkSetDoc as any)(...args); } catch (error) { return Promise.reject(error); }
}) as typeof sdkSetDoc;
export const deleteDoc: typeof sdkDeleteDoc = ((...args: any[]) => {
  try { assertCloudWritable(); return (sdkDeleteDoc as any)(...args); } catch (error) { return Promise.reject(error); }
}) as typeof sdkDeleteDoc;
export const runTransaction: typeof sdkRunTransaction = ((...args: any[]) => {
  try { assertCloudWritable(); return (sdkRunTransaction as any)(...args); } catch (error) { return Promise.reject(error); }
}) as typeof sdkRunTransaction;
export const writeBatch: typeof sdkWriteBatch = (...args) => {
  const batch = sdkWriteBatch(...args), commit = batch.commit.bind(batch);
  batch.commit = async () => { assertCloudWritable(); return commit(); };
  return batch;
};
