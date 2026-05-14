import { STORAGE_KEY, STORAGE_VERSION } from "./constants";
import type { GameState } from "./types";

// State persisted to localStorage. UI-only fields (`screen`, `shownCardIds`,
// `previousScreen`) are dropped at write time and reconstructed at read time.
type Persisted = Omit<GameState, "screen" | "shownCardIds" | "previousScreen"> & {
  version: string;
};

export function loadState(): Omit<Persisted, "version"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Version gate: force a fresh start on schema changes.
    if (parsed.version !== STORAGE_VERSION) return null;
    const { version: _, ...rest } = parsed;
    return rest as Omit<Persisted, "version">;
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    const { screen: _s, shownCardIds: _sc, previousScreen: _ps, ...persistable } = state;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...persistable, version: STORAGE_VERSION }),
    );
  } catch {
    // Quota errors / Safari private mode — ignore. Game still works in-memory.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above.
  }
}
