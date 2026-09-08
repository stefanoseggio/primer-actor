export interface StartUrlInput {
    url: string;
    method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'OPTIONS' | 'CONNECT' | 'PATCH';
    headers?: Record<string, string>;
    userData?: Record<string, unknown>;
}

export interface ActorInput {
    startUrls: StartUrlInput[];
    maxRequestsPerCrawl: number;
    paginationSelector?: string;
    maxPaginationDepth: number;
    proxyConfiguration?: Record<string, unknown>;
    onlyChanged?: boolean;
}

// This Actor crawls caller-supplied URLs rather than discovering listings
// from an enumerable registry, so it has no lifecycle/status concept to
// report - a page is either scraped for the first time, scraped again with
// identical content, or scraped again with different content. There is no
// STATUS_CHANGE or CLOSED here (see src/delta.ts).
export type ChangeEventType = 'NEW_URL' | 'CONTENT_CHANGED' | 'UNCHANGED';

// Raw parser output: no network/Actor/state dependency, so it stays a pure,
// unit-testable function of (HTML, url, depth, statusCode) alone.
export interface PageMetadata {
    url: string;
    title: string;
    metaDescription: string | null;
    canonicalUrl: string | null;
    ogTitle: string | null;
    ogImage: string | null;
    language: string | null;
    h1: string | null;
    wordCount: number;
    statusCode: number | null;
    crawlDepth: number;
    scrapedAt: string;
}

// PageMetadata enriched with the delta-classification fields, computed in
// src/routes.ts against persisted cross-run state. This is the shape
// actually pushed to the dataset.
export interface PageRecord extends PageMetadata {
    eventType: ChangeEventType;
    contentHash: string;
    previousScrapedAt: string | null;
}
