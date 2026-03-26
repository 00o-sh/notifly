import { describe, it, expect } from 'vitest';
import { validateFields } from './index.js';

describe('validateFields', () => {
  describe('required fields', () => {
    it('returns no errors for valid discord fields', () => {
      const errors = validateFields('discord', {
        webhook_id: '1234567890',
        webhook_token: 'abcdefghijklmnop',
      });
      expect(errors).toHaveLength(0);
    });

    it('returns error for missing required field', () => {
      const errors = validateFields('discord', { webhook_token: 'abc' });
      expect(errors.some(e => e.field === 'webhook_id')).toBe(true);
    });

    it('returns error for empty required field', () => {
      const errors = validateFields('discord', { webhook_id: '', webhook_token: 'abc' });
      expect(errors.some(e => e.field === 'webhook_id')).toBe(true);
    });

    it('returns no error for missing optional field', () => {
      const errors = validateFields('slack', {
        token_a: 'T000',
        token_b: 'B000',
        token_c: 'XXXX',
        // channel omitted (optional)
      });
      expect(errors.some(e => e.field === 'channel')).toBe(false);
    });
  });

  describe('pattern validation', () => {
    it('rejects discord webhook_id with non-numeric value', () => {
      const errors = validateFields('discord', {
        webhook_id: 'not-a-number',
        webhook_token: 'abc',
      });
      expect(errors.some(e => e.field === 'webhook_id')).toBe(true);
    });

    it('accepts numeric webhook_id', () => {
      const errors = validateFields('discord', {
        webhook_id: '1234567890',
        webhook_token: 'abc',
      });
      expect(errors.some(e => e.field === 'webhook_id')).toBe(false);
    });
  });

  describe('select validation', () => {
    it('rejects invalid gateway value', () => {
      const errors = validateFields('email', {
        to: 'a@b.com',
        gateway: 'unknown_gateway',
      });
      expect(errors.some(e => e.field === 'gateway')).toBe(true);
    });

    it('accepts valid gateway values', () => {
      for (const gateway of ['mailchannels', 'resend']) {
        const errors = validateFields('email', { to: 'a@b.com', gateway });
        expect(errors.some(e => e.field === 'gateway')).toBe(false);
      }
    });
  });

  describe('minLength/maxLength validation', () => {
    it('rejects pushover user_key that is too short', () => {
      const errors = validateFields('pushover', {
        user_key: 'short',
        api_token: 'azGDORePK8gMaC0QOYAMyEEuzJnyUi',
      });
      expect(errors.some(e => e.field === 'user_key')).toBe(true);
    });

    it('accepts pushover user_key of correct length', () => {
      const errors = validateFields('pushover', {
        user_key: 'uQiRzpo4DXghDmr9QzzfQu27cmVRsG',
        api_token: 'azGDORePK8gMaC0QOYAMyEEuzJnyUi',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('unknown service', () => {
    it('returns error for unknown service', () => {
      const errors = validateFields('nonexistent', {});
      expect(errors.some(e => e.field === 'service')).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('returns all errors at once', () => {
      const errors = validateFields('discord', {});
      expect(errors.length).toBeGreaterThanOrEqual(2); // webhook_id and webhook_token
    });
  });
});
