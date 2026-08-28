import { AppData, emptyData } from './types';
import { storageKey } from './mode';

const DB_NAME = 'owner-cash-check';
const DB_VERSION = 1;
const STORE = 'local-plan';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

export async function loadData(): Promise<AppData> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(storageKey());
    request.onsuccess = () => resolve((request.result as AppData | undefined) ?? emptyData());
    request.onerror = () => reject(request.error ?? new Error('Could not read your local cash plan.'));
    tx.oncomplete = () => db.close();
  });
}

export async function saveData(data: AppData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, storageKey());
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Could not save your changes.')); };
  });
}

export async function clearDemoData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete('demo:current');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Could not reset demo data.')); };
  });
}

export function validateImportedData(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('This file does not contain a cash plan.');
  const data = value as Partial<AppData>;
  if (data.version !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.checkIns)) {
    throw new Error('This backup version is not supported.');
  }
  if (data.settings && (typeof data.settings.balance !== 'number' || typeof data.settings.reserve !== 'number')) {
    throw new Error('The starting balance or reserve is invalid.');
  }
  return {
    version: 1,
    settings: data.settings ?? null,
    entries: data.entries,
    checkIns: data.checkIns,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()
  };
}
