import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';

import { extractMetadata } from '../../src/parsers/metadata.js';

const HTML = [
    '<html lang="es">',
    '<head>',
    '    <title>  Pagina de prueba  </title>',
    '    <meta name="description" content="Una descripcion de prueba" />',
    '    <link rel="canonical" href="/canonica" />',
    '    <meta property="og:title" content="OG titulo" />',
    '    <meta property="og:image" content="/imagen.png" />',
    '</head>',
    '<body>',
    '    <h1>Encabezado principal</h1>',
    '    <p>Un poco de texto de cuerpo para contar palabras.</p>',
    '</body>',
    '</html>',
].join('\n');

describe('extractMetadata', () => {
    it('extracts title, meta tags and computed fields from HTML', () => {
        const $ = cheerio.load(HTML);
        const result = extractMetadata($, 'https://example.com/pagina', 2, 200);

        expect(result.title).toBe('Pagina de prueba');
        expect(result.metaDescription).toBe('Una descripcion de prueba');
        expect(result.canonicalUrl).toBe('/canonica');
        expect(result.ogTitle).toBe('OG titulo');
        expect(result.ogImage).toBe('/imagen.png');
        expect(result.language).toBe('es');
        expect(result.h1).toBe('Encabezado principal');
        expect(result.wordCount).toBeGreaterThan(0);
        expect(result.statusCode).toBe(200);
        expect(result.crawlDepth).toBe(2);
        expect(result.url).toBe('https://example.com/pagina');
    });

    it('returns nulls for missing optional tags instead of throwing', () => {
        const $ = cheerio.load('<html><head><title>Solo titulo</title></head><body></body></html>');
        const result = extractMetadata($, 'https://example.com/vacia', 0, null);

        expect(result.title).toBe('Solo titulo');
        expect(result.metaDescription).toBeNull();
        expect(result.canonicalUrl).toBeNull();
        expect(result.ogTitle).toBeNull();
        expect(result.h1).toBeNull();
        expect(result.statusCode).toBeNull();
    });
});
