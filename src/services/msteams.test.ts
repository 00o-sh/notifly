import { describe, it, expect, vi, afterEach } from 'vitest';
import { msteamsService } from './msteams.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MSTeams service', () => {
  describe('parseUrl', () => {
    it('parses GUID@TenantGUID form', () => {
      const url = new URL('msteams://groupid@tenantid/channelId/webhookId');
      const config = msteamsService.parseUrl(url);
      expect(config).toMatchObject({
        service: 'msteams',
        groupId: 'groupid',
        tenantId: 'tenantid',
        channelId: 'channelId',
        webhookId: 'webhookId',
      });
    });

    it('parses simple hostname form (no @ separator)', () => {
      const url = new URL('msteams://token_a/channelId/webhookId');
      const config = msteamsService.parseUrl(url);
      expect(config).toMatchObject({
        service: 'msteams',
        groupId: 'token_a',
        tenantId: '',
        channelId: 'channelId',
        webhookId: 'webhookId',
      });
    });

    it('registers teams alias', () => {
      expect(msteamsService.schemas).toContain('teams');
    });
  });

  describe('send', () => {
    it('reconstructs webhook URL and posts message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const result = await msteamsService.send(
        { service: 'msteams', groupId: 'group1', tenantId: 'tenant1', channelId: 'chan1', webhookId: 'web1' },
        { body: 'Hello Teams' },
      );

      expect(result.success).toBe(true);
      expect(result.service).toBe('msteams');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://outlook.webhook.office.com/webhookb2/group1@tenant1/IncomingWebhook/chan1/web1');
      const body = JSON.parse(init.body);
      expect(body.text).toBe('Hello Teams');
    });

    it('prepends bold title in message text', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await msteamsService.send(
        { service: 'msteams', groupId: 'g', tenantId: 't', channelId: 'c', webhookId: 'w' },
        { title: 'Alert', body: 'Something happened' },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe('**Alert**\n\nSomething happened');
    });

    it('uses no-tenant URL when tenantId is empty', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      await msteamsService.send(
        { service: 'msteams', groupId: 'token_a', tenantId: '', channelId: 'chan', webhookId: 'wid' },
        { body: 'Hi' },
      );

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://outlook.webhook.office.com/webhookb2/token_a/IncomingWebhook/chan/wid');
    });

    it('returns failure result on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' }));

      const result = await msteamsService.send(
        { service: 'msteams', groupId: 'g', tenantId: 't', channelId: 'c', webhookId: 'w' },
        { body: 'Test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
    });
  });
});
