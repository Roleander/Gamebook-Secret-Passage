import {
  STORE_MUTATIONS,
  hasIndexedDb,
  openDb,
  requestToPromise,
  txDone,
} from "./idb";

export interface QueuedMutation {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  syntheticId?: string;
}

export interface StoredMutation extends QueuedMutation {
  key: number;
}

export type ReplayAction = "done" | "drop" | "stop";

export function classifyReplayStatus(status: number): ReplayAction {
  if (status >= 200 && status < 300) return "done";
  if (status === 401 || status === 403) return "stop";
  if (status >= 400 && status < 500) return "drop";
  return "stop";
}

export function applyIdMap(value: string, idMap: Map<string, string>): string {
  if (idMap.size === 0) return value;
  let result = value;
  for (const [oldId, newId] of idMap) {
    if (result.includes(oldId)) result = result.split(oldId).join(newId);
  }
  return result;
}

export function makeSyntheticId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("offline-queue-changed"));
  }
}

export function subscribeQueue(cb: () => void): () => void {
  window.addEventListener("offline-queue-changed", cb);
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("offline-queue-changed", cb);
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_MUTATIONS, "readwrite");
    tx.objectStore(STORE_MUTATIONS).add(mutation);
    await txDone(tx);
  } finally {
    db.close();
  }
  notifyQueueChanged();
}

export async function countMutations(): Promise<number> {
  if (!hasIndexedDb()) return 0;
  const db = await openDb();
  try {
    return await requestToPromise(
      db.transaction(STORE_MUTATIONS, "readonly").objectStore(STORE_MUTATIONS).count()
    );
  } finally {
    db.close();
  }
}

async function getAllMutations(): Promise<StoredMutation[]> {
  const db = await openDb();
  try {
    const store = db
      .transaction(STORE_MUTATIONS, "readonly")
      .objectStore(STORE_MUTATIONS);
    return await new Promise((resolve, reject) => {
      const results: StoredMutation[] = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(results);
          return;
        }
        results.push({
          ...(cursor.value as QueuedMutation),
          key: cursor.key as number,
        });
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function removeMutation(key: number): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_MUTATIONS, "readwrite");
    tx.objectStore(STORE_MUTATIONS).delete(key);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function replayQueue(): Promise<{ synced: number; dropped: number }> {
  if (!hasIndexedDb()) return { synced: 0, dropped: 0 };

  const mutations = await getAllMutations();
  const idMap = new Map<string, string>();
  let synced = 0;
  let dropped = 0;

  for (const mutation of mutations) {
    const url = applyIdMap(mutation.url, idMap);
    const body = mutation.body ? applyIdMap(mutation.body, idMap) : undefined;

    let response: Response;
    try {
      response = await fetch(url, {
        method: mutation.method,
        headers: mutation.headers,
        body,
      });
    } catch {
      break;
    }

    const action = classifyReplayStatus(response.status);

    if (action === "done") {
      if (
        mutation.syntheticId &&
        mutation.method === "POST" &&
        /\/passages$/.test(url)
      ) {
        const data = (await response.json().catch(() => null)) as
          | { id?: string }
          | null;
        if (data?.id) idMap.set(mutation.syntheticId, data.id);
      }
      await removeMutation(mutation.key);
      synced++;
    } else if (action === "drop") {
      await removeMutation(mutation.key);
      dropped++;
    } else {
      break;
    }
  }

  if (synced > 0 || dropped > 0) notifyQueueChanged();
  return { synced, dropped };
}
