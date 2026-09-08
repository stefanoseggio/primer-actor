import { Actor } from 'apify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createEmptyState, loadState, saveState } from '../src/state.js';
import type { DeltaState } from '../src/state.js';

describe('state persistence', () => {
    beforeAll(async () => {
        await Actor.init();
    });

    afterAll(async () => {
        await Actor.exit({ exit: false });
    });

    it('returns an empty state when nothing has been saved yet', async () => {
        const state = await loadState();
        expect(state.entries).toEqual({});
        expect(typeof state.lastRunAt).toBe('string');
    });

    it('round-trips a saved state', async () => {
        const state: DeltaState = {
            entries: { 'https://example.com/a': { contentHash: 'hash1', lastSeenAt: '2026-09-01T00:00:00.000Z' } },
            lastRunAt: '2026-09-01T00:00:00.000Z',
        };
        await saveState(state);
        const loaded = await loadState();
        expect(loaded).toEqual(state);
    });

    it('treats a malformed/legacy value as absent rather than throwing', async () => {
        // v1 of this Actor never wrote to this key, but simulate any
        // unexpected shape landing there (e.g. manual Console edit).
        await Actor.setValue('DELTA_STATE', { seenIds: ['a', 'b'] });
        const loaded = await loadState();
        expect(loaded).toEqual(createEmptyState());
    });
});
