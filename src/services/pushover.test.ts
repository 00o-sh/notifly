import { describe, it, expect, vi, afterEach } from 'vitest';
import { pushoverService } from './pushover.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Pushover service', () => {
  describe('parseUrl', () => {
    it('parses user_key and api_token', () => {
      const url = new URL('pover://myuserkey/myapitoken');
      const config = pushoverService.parseUrl(url);
      expect(config).toEqual({ service: 'pushover', userKey: 'myuserkey', apiToken: 'myapitoken', device: undefined });
    });

    it('parses optional device from third path segment', () => {
      const url = new URL('pover://myuserkey/myapitoken/myphone');
      const config = pushoverService.parseUrl(url);
      expect(config).toMatchObject({ userKey: 'myuserkey', apiToken: 'myapitoken', device: 'myphone' });
    });

    it('leaves device undefined when not provided', () => {
      const url = new URL('pover://key/token');
      const config = pushoverService.parseUrl(url);
      expect(config.device).toBeUndefined();
    });
  });

  describe('send', () => {
    it('posts to Pushover messages API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const result = await pushoverService.send(
        { service: 'pushover', userKey: 'ukey', apiToken: 'atoken', device: undefined },
        { title: 'Alert', body: 'Something went wrong' },
      );

      expect(result.success).toBe(true);
      expect(result.service).toBe('pushover');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pushover.net/1/messages.json',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.token).toBe('atoken');
      expect(body.user).toBe('ukey');
      expect(body.message).toBe('Something went wrong');
      expect(body.title).toBe('Alert');
    });

    it('maps message type to Pushover priority', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      for (const [type, expected] of [['info', 0], ['success', 0], ['warning', 1], ['failure', 2]] as const) {
        mockFetch.mockClear();
        await pushoverService.send(
          { service: 'pushover', userKey: 'u', apiToken: 't' },
          { body: 'test', type },
        );
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.priority).toBe(expected);
      }
    });

    it('includes device when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await pushoverService.send(
        { service: 'pushover', userKey: 'u', apiToken: 't', device: 'myphone' },
        { body: 'test' },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.device).toBe('myphone');
    });

    it('omits device when not provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await pushoverService.send(
        { service: 'pushover', userKey: 'u', apiToken: 't' },
        { body: 'test' },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.device).toBeUndefined();
    });

    it('returns failure result on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'Bad Request' }));

      const result = await pushoverService.send(
        { service: 'pushover', userKey: 'bad', apiToken: 'bad' },
        { body: 'Test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('400');
    });
  });
});
