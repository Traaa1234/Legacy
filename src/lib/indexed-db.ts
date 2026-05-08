import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'legacy';
const STORE = 'pending-audio';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function putPendingAudio(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put(STORE, blob, id);
}

export async function getPendingAudio(id: string): Promise<Blob | null> {
  const db = await getDb();
  const value = await db.get(STORE, id);
  return value ?? null;
}

export async function clearPendingAudio(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function listPendingAudioIds(): Promise<string[]> {
  const db = await getDb();
  const keys = await db.getAllKeys(STORE);
  return keys.map(String);
}
