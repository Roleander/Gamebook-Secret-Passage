import type { OfflineProjectSnapshot } from "./offline-snapshot";

export interface CachedProjectSummary {
  id: string;
  title: string;
  description: string | null;
  savedAt: string;
  passageCount: number;
}

const DB_NAME = "gbsp-offline";
const DB_VERSION = 1;
const STORE = "projects";

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheProject(
  snapshot: OfflineProjectSnapshot
): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listCachedProjects(): Promise<CachedProjectSummary[]> {
  if (!hasIndexedDb()) return [];
  const db = await openDb();
  try {
    const snapshots = await requestToPromise(
      db.transaction(STORE, "readonly").objectStore(STORE).getAll()
    );
    return (snapshots as OfflineProjectSnapshot[])
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        savedAt: s.savedAt,
        passageCount: s.passages.length,
      }))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } finally {
    db.close();
  }
}

export async function getCachedProject(
  id: string
): Promise<OfflineProjectSnapshot | null> {
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  try {
    const snapshot = await requestToPromise(
      db.transaction(STORE, "readonly").objectStore(STORE).get(id)
    );
    return (snapshot as OfflineProjectSnapshot | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function removeCachedProject(id: string): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
