import { Actor } from 'apify';

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
    const raw = await Actor.getValue(STATE_KEY);
    return isValidState(raw) ? raw : createEmptyState();
}

export async function saveState(state: DeltaState): Promise<void> {
    await Actor.setValue(STATE_KEY, state);
}
