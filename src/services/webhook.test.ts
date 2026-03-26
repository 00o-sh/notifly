import { describe, it, expect, vi, afterEach } from 'vitest';
import { webhookService } from './webhook.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Webhook service', () => {
  describe('parseUrl', () => {
    it('parses json:// as HTTP JSON endpoint', () => {
      const url = new URL('json://example.com/notify');
      const config = webhookService.parseUrl(url);
      expect(config).toMatchObject({
        service: 'webhook',
        targetUrl: 'http://example.com/notify',
        isJson: true,
        method: 'POST',
        extraHeaders: {},
        extraFields: {},
      });
    });

    it('parses jsons:// as HTTPS JSON endpoint', () => {
      const url = new URL('jsons://example.com/notify');
      const config = webhookService.parseUrl(url);
      expect(config).toMatchObject({ targetUrl: 'https://example.com/notify', isJson: true });
    });

    it('parses form:// as HTTP form-encoded endpoint', () => {
      const url = new URL('form://example.com/hook');
      const config = webhookService.parseUrl(url);
      expect(config).toMatchObject({ targetUrl: 'http://example.com/hook', isJson: false });
    });

    it('parses forms:// as HTTPS form-encoded endpoint', () => {
      const url = new URL('forms://example.com/hook');
      const config = webhookService.parseUrl(url);
      expect(config).toMatchObject({ targetUrl: 'https://example.com/hook', isJson: false });
    });

    it('extracts custom headers from + prefixed params', () => {
      const url = new URL('jsons://example.com/hook?+Authorization=Bearer+abc&+X-Custom=value');
      const config = webhookService.parseUrl(url);
      expect(config.extraHeaders).toEqual({ Authorization: 'Bearer abc', 'X-Custom': 'value' });
    });

    it('extracts extra body fields from - prefixed params', () => {
      const url = new URL('jsons://example.com/hook?-source=myapp&-version=2');
      const config = webhookService.parseUrl(url);
      expect(config.extraFields).toEqual({ source: 'myapp', version: '2' });
    });

    it('extracts method override from method param', () => {
      const url = new URL('jsons://example.com/hook?method=PUT');
      const config = webhookService.parseUrl(url);
      expect(config.method).toBe('PUT');
    });

    it('registers all four schemes', () => {
      expect(webhookService.schemas).toEqual(expect.arrayContaining(['json', 'jsons', 'form', 'forms']));
    });
  });

  describe('send', () => {
    it('POSTs JSON body to target URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const result = await webhookService.send(
        { service: 'webhook', targetUrl: 'https://example.com/hook', isJson: true, method: 'POST', extraHeaders: {}, extraFields: {} },
        { title: 'Alert', body: 'Something happened', type: 'warning' },
      );

      expect(result.success).toBe(true);
      expect(result.service).toBe('webhook');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://example.com/hook');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ title: 'Alert', body: 'Something happened', type: 'warning' });
    });

    it('POSTs form-encoded body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await webhookService.send(
        { service: 'webhook', targetUrl: 'https://example.com/hook', isJson: false, method: 'POST', extraHeaders: {}, extraFields: {} },
        { body: 'Hello' },
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(init.body).toContain('body=Hello');
    });

    it('includes custom headers in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await webhookService.send(
        { service: 'webhook', targetUrl: 'https://example.com/hook', isJson: true, method: 'POST', extraHeaders: { Authorization: 'Bearer xyz' }, extraFields: {} },
        { body: 'Hi' },
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer xyz');
    });

    it('merges extra fields into JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await webhookService.send(
        { service: 'webhook', targetUrl: 'https://example.com/hook', isJson: true, method: 'POST', extraHeaders: {}, extraFields: { source: 'myapp' } },
        { body: 'Hi' },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.source).toBe('myapp');
    });

    it('uses method override', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await webhookService.send(
        { service: 'webhook', targetUrl: 'https://example.com/hook', isJson: true, method: 'PUT', extraHeaders: {}, extraFields: {} },
        { body: 'Hi' },
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('PUT');
    });

    it('returns failure result on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'Not Found' }));

      const result = await webhookService.send(
        { service: 'webhook', targetUrl: 'https://example.com/missing', isJson: true, method: 'POST', extraHeaders: {}, extraFields: {} },
        { body: 'Test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });
  });
});
