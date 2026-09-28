import type { OfflineProjectSnapshot } from "./offline-snapshot";
import {
  STORE_EDITOR,
  STORE_PROJECTS,
  hasIndexedDb,
  openDb,
  requestToPromise,
  txDone,
} from "./idb";

export interface CachedProjectSummary {
  id: string;
  title: string;
  description: string | null;
  savedAt: string;
  passageCount: number;
}

export async function cacheProject(
  snapshot: OfflineProjectSnapshot
): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    tx.objectStore(STORE_PROJECTS).put(snapshot);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function listCachedProjects(): Promise<CachedProjectSummary[]> {
  if (!hasIndexedDb()) return [];
  const db = await openDb();
  try {
    const snapshots = await requestToPromise(
      db.transaction(STORE_PROJECTS, "readonly").objectStore(STORE_PROJECTS).getAll()
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
      db.transaction(STORE_PROJECTS, "readonly").objectStore(STORE_PROJECTS).get(id)
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
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    tx.objectStore(STORE_PROJECTS).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function saveEditorProject<T extends { id: string }>(
  project: T
): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_EDITOR, "readwrite");
    tx.objectStore(STORE_EDITOR).put(project);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getEditorProject<T>(id: string): Promise<T | null> {
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  try {
    const project = await requestToPromise(
      db.transaction(STORE_EDITOR, "readonly").objectStore(STORE_EDITOR).get(id)
    );
    return (project as T | undefined) ?? null;
  } finally {
    db.close();
  }
}
