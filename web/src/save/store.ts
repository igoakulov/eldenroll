// The save layer: `localStorage` now, a server once accounts exist (web/README.md#Saving). It moves JSON only;
// `restore.ts` checks what it reads.
import { withFinished, type FinishedRun } from "./finished";
import type { SavedRun, Setup } from "./restore";

export interface Stored {
  readonly active: unknown;
  readonly setup: unknown;
  readonly past: readonly unknown[];
}

export interface SaveStore {
  readonly load: () => Promise<Stored>;
  /** `null` removes it. */
  readonly saveActive: (saved: SavedRun | null) => void;
  /** Keeps a saved run that holds nothing usable under a key of its own, so it is never overwritten. */
  readonly setAsideActive: () => void;
  readonly saveSetup: (setup: Setup | null) => void;
  readonly addFinished: (run: FinishedRun) => void;
  /** Another tab saved or removed the active run. */
  readonly onActiveChange: (listener: (value: unknown) => void) => () => void;
}

/** The part of `Storage` the store uses, so tests can pass a plain map. */
export type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEYS = { active: "eldenroll.active", setup: "eldenroll.setup", past: "eldenroll.pastRuns" } as const;

export function keyValueStore(
  storage: KeyValue | null,
  options: { readonly onFirstSave?: () => void; readonly events?: Pick<Window, "addEventListener" | "removeEventListener"> } = {},
): SaveStore {
  let saved = false;

  const setAside = (key: string) => {
    attempt(() => {
      const text = storage?.getItem(key) ?? null;
      if (text === null) return;
      storage?.setItem(`${key}.unreadable`, text);
      storage?.removeItem(key);
    }, undefined);
  };
  /** A value that isn't JSON is set aside, so nothing is lost and Start opens fresh. */
  const read = (key: string): unknown => {
    const text = attempt(() => storage?.getItem(key) ?? null, null);
    if (text === null) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      setAside(key);
      return null;
    }
  };
  const write = (key: string, value: unknown) => {
    attempt(() => (value === null ? storage?.removeItem(key) : storage?.setItem(key, JSON.stringify(value))), undefined);
  };

  return {
    load: () => {
      const past = read(KEYS.past);
      return Promise.resolve({ active: read(KEYS.active), setup: read(KEYS.setup), past: Array.isArray(past) ? past : [] });
    },
    saveActive: (value) => {
      if (value !== null && !saved) {
        saved = true;
        options.onFirstSave?.();
      }
      write(KEYS.active, value);
    },
    setAsideActive: () => setAside(KEYS.active),
    saveSetup: (value) => write(KEYS.setup, value),
    addFinished: (run) => {
      const past = read(KEYS.past);
      write(KEYS.past, withFinished(Array.isArray(past) ? past : [], run));
    },
    onActiveChange: (listener) => {
      const events = options.events;
      if (events === undefined) return () => {};
      const handle = (event: Event) => {
        const { key, newValue } = event as StorageEvent;
        if (key !== KEYS.active && key !== null) return;
        try {
          listener(newValue === null ? null : (JSON.parse(newValue) as unknown));
        } catch {
          listener(null);
        }
      };
      events.addEventListener("storage", handle);
      return () => events.removeEventListener("storage", handle);
    },
  };
}

/** Storage can be refused (private browsing, full, blocked): the run then lives in memory and play goes on. */
function attempt<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

export function browserStore(): SaveStore {
  const storage = attempt(() => window.localStorage, null);
  return keyValueStore(storage, {
    // Asks the browser to clear this site's storage last when the phone runs short of space
    onFirstSave: () => void navigator.storage?.persist?.().catch(() => {}),
    events: window,
  });
}
