import { describe, expect, it } from 'vitest';

import { classifyPage } from '../src/delta.js';
import { createEmptyState } from '../src/state.js';
import type { DeltaState } from '../src/state.js';

describe('classifyPage', () => {
    it('classifies a URL with no prior entry as NEW_URL', () => {
        const state = createEmptyState();
        const result = classifyPage('https://example.com/a', 'hash1', state);
        expect(result).toEqual({ eventType: 'NEW_URL', previousScrapedAt: null });
    });

    it('classifies a URL with the same fingerprint as UNCHANGED', () => {
        const state: DeltaState = {
            entries: { 'https://example.com/a': { contentHash: 'hash1', lastSeenAt: '2026-09-01T00:00:00.000Z' } },
            lastRunAt: '2026-09-01T00:00:00.000Z',
        };
        const result = classifyPage('https://example.com/a', 'hash1', state);
        expect(result).toEqual({ eventType: 'UNCHANGED', previousScrapedAt: '2026-09-01T00:00:00.000Z' });
    });

    it('classifies a URL with a different fingerprint as CONTENT_CHANGED', () => {
        const state: DeltaState = {
            entries: { 'https://example.com/a': { contentHash: 'hash1', lastSeenAt: '2026-09-01T00:00:00.000Z' } },
            lastRunAt: '2026-09-01T00:00:00.000Z',
        };
        const result = classifyPage('https://example.com/a', 'hash2', state);
        expect(result).toEqual({ eventType: 'CONTENT_CHANGED', previousScrapedAt: '2026-09-01T00:00:00.000Z' });
    });

    it('does not confuse two different URLs sharing no entry', () => {
        const state: DeltaState = {
            entries: { 'https://example.com/a': { contentHash: 'hash1', lastSeenAt: '2026-09-01T00:00:00.000Z' } },
            lastRunAt: '2026-09-01T00:00:00.000Z',
        };
        const result = classifyPage('https://example.com/b', 'hash1', state);
        expect(result.eventType).toBe('NEW_URL');
    });
});
