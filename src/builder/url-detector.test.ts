import { describe, it, expect } from 'vitest';
import { detectAndConvert, isRawServiceUrl, smartParse } from './url-detector.js';

describe('detectAndConvert', () => {
  describe('Discord', () => {
    it('converts a Discord webhook URL', () => {
      const result = detectAndConvert('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwx');
      expect(result).not.toBeNull();
      expect(result!.service).toBe('discord');
      expect(result!.notiflyUrl).toBe('discord://1234567890/abcdefghijklmnopqrstuvwx');
      expect(result!.fields['webhook_id']).toBe('1234567890');
      expect(result!.fields['webhook_token']).toBe('abcdefghijklmnopqrstuvwx');
    });

    it('also matches discordapp.com', () => {
      const result = detectAndConvert('https://discordapp.com/api/webhooks/111/aaa');
      expect(result?.service).toBe('discord');
    });

    it('returns null for non-webhook Discord URLs', () => {
      expect(detectAndConvert('https://discord.com/channels/123/456')).toBeNull();
    });
  });

  describe('Slack', () => {
    it('converts a Slack incoming webhook URL', () => {
      const result = detectAndConvert('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX');
      expect(result).not.toBeNull();
      expect(result!.service).toBe('slack');
      expect(result!.notiflyUrl).toBe('slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX');
      expect(result!.fields['token_a']).toBe('T00000000');
      expect(result!.fields['token_b']).toBe('B00000000');
      expect(result!.fields['token_c']).toBe('XXXXXXXXXXXXXXXXXXXXXXXX');
    });

    it('returns null for non-services Slack URLs', () => {
      expect(detectAndConvert('https://hooks.slack.com/triggers/abc')).toBeNull();
    });
  });

  describe('Microsoft Teams', () => {
    it('converts a Teams webhook URL with GUID@TenantGUID', () => {
      const raw = 'https://outlook.webhook.office.com/webhookb2/groupGUID@tenantGUID/IncomingWebhook/chanId/webId';
      const result = detectAndConvert(raw);
      expect(result).not.toBeNull();
      expect(result!.service).toBe('msteams');
      expect(result!.notiflyUrl).toBe('msteams://groupGUID@tenantGUID/chanId/webId');
      expect(result!.fields['group_id']).toBe('groupGUID');
      expect(result!.fields['tenant_id']).toBe('tenantGUID');
      expect(result!.fields['channel_id']).toBe('chanId');
      expect(result!.fields['webhook_id']).toBe('webId');
    });

    it('converts a Teams webhook URL without tenant (no @)', () => {
      const raw = 'https://myorg.webhook.office.com/webhookb2/groupId/IncomingWebhook/chanId/webId';
      const result = detectAndConvert(raw);
      expect(result?.service).toBe('msteams');
      expect(result?.notiflyUrl).toBe('msteams://groupId/chanId/webId');
      expect(result?.fields['tenant_id']).toBeUndefined();
    });

    it('matches any *.webhook.office.com subdomain', () => {
      const raw = 'https://xxxxx.webhook.office.com/webhookb2/gid/IncomingWebhook/cid/wid';
      expect(detectAndConvert(raw)?.service).toBe('msteams');
    });
  });

  describe('Telegram', () => {
    it('extracts bot_token from Telegram API URL, leaves chat_id empty', () => {
      const result = detectAndConvert('https://api.telegram.org/bot123456:ABCdefGhIjK/sendMessage');
      expect(result).not.toBeNull();
      expect(result!.service).toBe('telegram');
      expect(result!.fields['bot_token']).toBe('123456:ABCdefGhIjK');
      expect(result!.fields['chat_id']).toBe('');
    });

    it('matches bare /bot{token} URL with no trailing path', () => {
      const result = detectAndConvert('https://api.telegram.org/bot987654:XYZ');
      expect(result?.fields['bot_token']).toBe('987654:XYZ');
    });

    it('returns null for non-bot Telegram URLs', () => {
      expect(detectAndConvert('https://api.telegram.org/file/bot123/doc.pdf')).toBeNull();
    });
  });

  describe('ntfy', () => {
    it('converts an ntfy.sh URL', () => {
      const result = detectAndConvert('https://ntfy.sh/my-alert-topic');
      expect(result).not.toBeNull();
      expect(result!.service).toBe('ntfy');
      expect(result!.notiflyUrl).toBe('ntfy://my-alert-topic');
      expect(result!.fields['topic']).toBe('my-alert-topic');
      expect(result!.fields['host']).toBe('ntfy.sh');
    });

    it('returns null for ntfy.sh with no topic', () => {
      expect(detectAndConvert('https://ntfy.sh/')).toBeNull();
    });

    it('returns null for arbitrary https hosts without Gotify /message pattern', () => {
      expect(detectAndConvert('https://somehost.example.com/topic')).toBeNull();
    });
  });

  describe('Gotify', () => {
    it('converts a Gotify /message URL', () => {
      const result = detectAndConvert('https://gotify.example.com/message?token=Axxxxxxxxx');
      expect(result).not.toBeNull();
      expect(result!.service).toBe('gotify');
      expect(result!.notiflyUrl).toBe('gotify://gotify.example.com/Axxxxxxxxx');
      expect(result!.fields['host']).toBe('gotify.example.com');
      expect(result!.fields['token']).toBe('Axxxxxxxxx');
    });

    it('returns null for /message without token', () => {
      expect(detectAndConvert('https://gotify.example.com/message')).toBeNull();
    });
  });

  describe('non-matching URLs', () => {
    it('returns null for completely unknown HTTPS URLs', () => {
      expect(detectAndConvert('https://example.com/some/path')).toBeNull();
    });

    it('returns null for Apprise-format URLs (custom schemes)', () => {
      expect(detectAndConvert('discord://1234/abcd')).toBeNull();
      expect(detectAndConvert('slack://T000/B000/XXXX')).toBeNull();
      expect(detectAndConvert('pover://userkey/token')).toBeNull();
    });

    it('returns null for malformed strings', () => {
      expect(detectAndConvert('not a url')).toBeNull();
      expect(detectAndConvert('')).toBeNull();
      expect(detectAndConvert('https://')).toBeNull();
    });
  });
});

describe('isRawServiceUrl', () => {
  it('returns true for https:// URLs', () => {
    expect(isRawServiceUrl('https://discord.com/api/webhooks/123/abc')).toBe(true);
    expect(isRawServiceUrl('https://hooks.slack.com/services/T/B/C')).toBe(true);
  });

  it('returns true for http:// URLs', () => {
    expect(isRawServiceUrl('http://ntfy.sh/topic')).toBe(true);
  });

  it('returns false for Apprise-format URLs', () => {
    expect(isRawServiceUrl('discord://123/abc')).toBe(false);
    expect(isRawServiceUrl('slack://T/B/C')).toBe(false);
    expect(isRawServiceUrl('pover://key/token')).toBe(false);
  });

  it('returns false for non-URLs', () => {
    expect(isRawServiceUrl('not-a-url')).toBe(false);
    expect(isRawServiceUrl('')).toBe(false);
  });
});

describe('smartParse', () => {
  it('converts a raw Discord webhook URL', () => {
    const result = smartParse('https://discord.com/api/webhooks/1234567890/mytoken');
    expect(result).not.toBeNull();
    expect(result!.service).toBe('discord');
    expect(result!.notiflyUrl).toBe('discord://1234567890/mytoken');
    expect(result!.fields['webhook_id']).toBe('1234567890');
  });

  it('parses an existing Apprise discord URL', () => {
    const result = smartParse('discord://1234567890/mytoken');
    expect(result).not.toBeNull();
    expect(result!.service).toBe('discord');
    expect(result!.notiflyUrl).toBe('discord://1234567890/mytoken');
    expect(result!.fields['webhook_id']).toBe('1234567890');
  });

  it('parses an existing Apprise slack URL', () => {
    const result = smartParse('slack://T000/B000/XXXX');
    expect(result?.service).toBe('slack');
    expect(result?.fields['token_a']).toBe('T000');
  });

  it('converts a raw Slack webhook URL', () => {
    const result = smartParse('https://hooks.slack.com/services/T000/B000/XXXX');
    expect(result?.service).toBe('slack');
    expect(result?.notiflyUrl).toBe('slack://T000/B000/XXXX');
  });

  it('parses existing ntfy Apprise URL', () => {
    const result = smartParse('ntfy://my-topic');
    expect(result?.service).toBe('ntfy');
    expect(result?.fields['topic']).toBe('my-topic');
  });

  it('converts raw ntfy.sh URL', () => {
    const result = smartParse('https://ntfy.sh/my-topic');
    expect(result?.service).toBe('ntfy');
    expect(result?.notiflyUrl).toBe('ntfy://my-topic');
  });

  it('parses existing Apprise gotify URL', () => {
    const result = smartParse('gotify://myhost.com/mytoken');
    expect(result?.service).toBe('gotify');
    expect(result?.fields['host']).toBe('myhost.com');
    expect(result?.fields['token']).toBe('mytoken');
  });

  it('parses existing msteams Apprise URL', () => {
    const result = smartParse('msteams://groupid@tenantid/chan/wid');
    expect(result?.service).toBe('msteams');
    expect(result?.fields['group_id']).toBe('groupid');
  });

  it('returns null for completely unknown URLs', () => {
    expect(smartParse('https://example.com/unknown')).toBeNull();
  });

  it('returns null for unknown Apprise schemes', () => {
    expect(smartParse('unknown://somehost/path')).toBeNull();
  });

  it('returns null for malformed strings', () => {
    expect(smartParse('not a url at all')).toBeNull();
    expect(smartParse('')).toBeNull();
  });
});
