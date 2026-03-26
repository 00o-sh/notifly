import { describe, it, expect, vi, afterEach } from 'vitest';
import { pushbulletService } from './pushbullet.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Pushbullet service', () => {
  describe('parseUrl', () => {
    it('parses access token with no target', () => {
      const url = new URL('pbul://myaccesstoken');
      const config = pushbulletService.parseUrl(url);
      expect(config).toEqual({
        service: 'pushbullet',
        accessToken: 'myaccesstoken',
        deviceIden: undefined,
        channelTag: undefined,
      });
    });

    it('parses device_id from path', () => {
      const url = new URL('pbul://myaccesstoken/ujpah72o0sjAoRtnM0jc');
      const config = pushbulletService.parseUrl(url);
      expect(config).toMatchObject({
        accessToken: 'myaccesstoken',
        deviceIden: 'ujpah72o0sjAoRtnM0jc',
        channelTag: undefined,
      });
    });

    it('parses channel tag from path (encoded #)', () => {
      const url = new URL('pbul://myaccesstoken/%23mychannel');
      const config = pushbulletService.parseUrl(url);
      expect(config).toMatchObject({
        accessToken: 'myaccesstoken',
        channelTag: 'mychannel',
        deviceIden: undefined,
      });
    });
  });

  describe('send', () => {
    it('pushes note to all devices', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const result = await pushbulletService.send(
        { service: 'pushbullet', accessToken: 'mytoken', deviceIden: undefined, channelTag: undefined },
        { title: 'Hello', body: 'World' },
      );

      expect(result.success).toBe(true);
      expect(result.service).toBe('pushbullet');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.pushbullet.com/v2/pushes');
      expect(init.headers['Access-Token']).toBe('mytoken');
      const body = JSON.parse(init.body);
      expect(body.type).toBe('note');
      expect(body.title).toBe('Hello');
      expect(body.body).toBe('World');
    });

    it('sends to specific device when deviceIden is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await pushbulletService.send(
        { service: 'pushbullet', accessToken: 'tok', deviceIden: 'dev123', channelTag: undefined },
        { body: 'test' },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.device_iden).toBe('dev123');
      expect(body.channel_tag).toBeUndefined();
    });

    it('sends to channel when channelTag is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await pushbulletService.send(
        { service: 'pushbullet', accessToken: 'tok', deviceIden: undefined, channelTag: 'mychan' },
        { body: 'test' },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.channel_tag).toBe('mychan');
      expect(body.device_iden).toBeUndefined();
    });

    it('returns failure result on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }));

      const result = await pushbulletService.send(
        { service: 'pushbullet', accessToken: 'bad' },
        { body: 'Test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });
  });
});
