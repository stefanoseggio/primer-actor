import { Actor } from 'apify';

// Deliberately a NAMED key-value store, not Actor.getValue()/setValue().
// Those are shortcuts for the store "associated with the current Actor
// run" (confirmed against node_modules/apify/dist/actor.d.ts) - i.e. a
// fresh, run-scoped store every single call, never shared across separate
// runs. Cross-run delta state needs a store that outlives one run, which
// on this platform means opening one by a fixed NAME: Actor.openKeyValueStore()
// with a name looks up (or creates) the same persistent store every time,
// regardless of which run opens it. This was caught by real cloud
// verification, not local testing: two separate `apify actors call` runs
// against the same URLs both returned a *different* Key-value store ID and
// both classified every page NEW_URL - proof the previous getValue/setValue
// version never actually persisted anything across runs.
const STATE_STORE_NAME = 'primer-actor-delta-state';
const STATE_KEY = 'DELTA_STATE';

export interface UrlEntry {
    contentHash: string;
    lastSeenAt: string;
}

export interface DeltaState {
    entries: Record<string, UrlEntry>;
    lastRunAt: string;
}

// v1 of this Actor had no state/KV concept at all, so there is no legacy
// shape to migrate - anything that isn't a valid v2 DeltaState (including
// the very first run, where the key doesn't exist yet) is simply absent.
function isValidState(value: unknown): value is DeltaState {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.lastRunAt !== 'string') return false;
    if (typeof candidate.entries !== 'object' || candidate.entries === null) return false;
    return true;
}

export function createEmptyState(): DeltaState {
    return { entries: {}, lastRunAt: new Date(0).toISOString() };
}

export async function loadState(): Promise<DeltaState> {
    const store = await Actor.openKeyValueStore(STATE_STORE_NAME);
    const raw = await store.getValue(STATE_KEY);
    return isValidState(raw) ? raw : createEmptyState();
}

export async function saveState(state: DeltaState): Promise<void> {
    const store = await Actor.openKeyValueStore(STATE_STORE_NAME);
    await store.setValue(STATE_KEY, state);
}
