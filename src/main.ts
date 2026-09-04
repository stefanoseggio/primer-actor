import { Actor, log } from 'apify';
import { CheerioCrawler } from 'crawlee';

import { router } from './routes.js';
import type { ActorInput } from './types.js';

await Actor.init();
await run();
await Actor.exit();

async function run(): Promise<void> {
    const input = (await Actor.getInput<ActorInput>()) ?? ({} as ActorInput);
    const {
        startUrls = [{ url: 'https://apify.com' }],
        maxRequestsPerCrawl = 100,
        paginationSelector,
        maxPaginationDepth = 3,
        proxyConfiguration: proxyConfigurationInput,
    } = input;

    if (startUrls.length === 0) {
        log.error('No se recibio ninguna startUrl. Agrega al menos una URL para rastrear.');
        return;
    }

    const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfigurationInput);

    const seededRequests = startUrls.map((entry) => ({
        ...entry,
        userData: {
            ...entry.userData,
            depth: 0,
            paginationDepth: 0,
            paginationSelector,
            maxPaginationDepth,
        },
    }));

    let failedCount = 0;

    const crawler = new CheerioCrawler({
        proxyConfiguration,
        maxRequestsPerCrawl,
        maxRequestRetries: 4,
        requestHandlerTimeoutSecs: 60,
        retryOnBlocked: true,
        useSessionPool: true,
        persistCookiesPerSession: true,
        requestHandler: router,
        failedRequestHandler: async ({ request }, error) => {
            failedCount += 1;
            log.error(`Descartado tras ${request.retryCount} reintentos: ${request.url}`, {
                errorMessage: error.message,
            });
            await Actor.pushData({
                url: request.url,
                error: error.message,
                failedAtRetry: request.retryCount,
                scrapedAt: new Date().toISOString(),
            });
        },
    });

    await crawler.run(seededRequests);

    if (failedCount > 0) {
        log.warning(
            `Terminado con ${failedCount} request(s) fallidos permanentemente. Ver registros con campo "error" en el dataset.`,
        );
    }
}
