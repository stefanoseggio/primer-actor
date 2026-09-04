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
}

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
