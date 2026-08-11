import { isDesktopRuntime } from "./runtime";

const KEY = "atlas.lastProjectPath";
const STORE_FILE = "atlas.json";

type TauriStore = {
  get<T>(key: string): Promise<T | null | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
};

let storePromise: Promise<TauriStore> | null = null;

async function getStore(): Promise<TauriStore> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then((m) =>
      m.load(STORE_FILE, { autoSave: true }),
    ) as Promise<TauriStore>;
  }
  return storePromise;
}

export async function loadLastProjectPath(): Promise<string | null> {
  try {
    if (isDesktopRuntime()) {
      const store = await getStore();
      return (await store.get<string>(KEY)) ?? null;
    }
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function saveLastProjectPath(path: string): Promise<void> {
  try {
    if (isDesktopRuntime()) {
      const store = await getStore();
      await store.set(KEY, path);
      await store.save();
      return;
    }
    localStorage.setItem(KEY, path);
  } catch {
    /* persistence is best-effort */
  }
}

export async function clearLastProjectPath(): Promise<void> {
  try {
    if (isDesktopRuntime()) {
      const store = await getStore();
      await store.delete(KEY);
      await store.save();
      return;
    }
    localStorage.removeItem(KEY);
  } catch {
    /* persistence is best-effort */
  }
}
