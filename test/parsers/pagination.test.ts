import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';

import { findNextPageUrl } from '../../src/parsers/pagination.js';

describe('findNextPageUrl', () => {
    it('resolves a relative next-page href against the current page URL', () => {
        const $ = cheerio.load('<a rel="next" href="/list?page=2">Siguiente</a>');
        const next = findNextPageUrl($, 'https://example.com/list?page=1', 'a[rel="next"]');
        expect(next).toBe('https://example.com/list?page=2');
    });

    it('returns null when the selector matches nothing', () => {
        const $ = cheerio.load('<div>sin paginacion</div>');
        const next = findNextPageUrl($, 'https://example.com/list', 'a[rel="next"]');
        expect(next).toBeNull();
    });

    it('returns null when the matched anchor has no href', () => {
        const $ = cheerio.load('<a rel="next">Siguiente sin link</a>');
        const next = findNextPageUrl($, 'https://example.com/list', 'a[rel="next"]');
        expect(next).toBeNull();
    });
});
