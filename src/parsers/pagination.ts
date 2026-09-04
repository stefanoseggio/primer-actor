import type { CheerioCrawlingContext } from 'crawlee';

type CheerioAPI = CheerioCrawlingContext['$'];

// Resolves an explicit "next page" link (e.g. rel="next") relative to the
// current page URL. Returns null instead of throwing on malformed/missing
// hrefs so a bad pagination selector degrades to "no pagination", not a crash.
export function findNextPageUrl($: CheerioAPI, baseUrl: string, selector: string): string | null {
    const href = $(selector).first().attr('href');
    if (!href) return null;

    try {
        return new URL(href, baseUrl).toString();
    } catch {
        return null;
    }
}
