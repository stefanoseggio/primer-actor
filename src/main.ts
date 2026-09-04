import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

// Configuración del proxy según el plan/entorno
const proxyConfiguration = await Actor.createProxyConfiguration();

const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 30,
    useSessionPool: true,
    async requestHandler({ request, $, log }) {
        const title = $('title').text().trim();

        // Registrar evento de cobro
        const { eventChargeLimitReached } = await Actor.charge({ eventName: 'item', count: 1 });

        // Guardar resultado
        await Actor.pushData({
            title,
            url: request.url,
            scrapedAt: new Date().toISOString(),
        });

        // Detener si el usuario alcanzó su presupuesto límite
        if (eventChargeLimitReached) {
            log.info('Límite de presupuesto alcanzado por el usuario. Finalizando extracción.');
            await crawler.autoscaledPool?.abort();
        }
    },
});

// Probar con una URL ligera
await crawler.run(['https://example.com']);

await Actor.exit();