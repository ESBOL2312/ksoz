import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const base = { DATABASE_URL: 'postgres://x', BOT_TOKEN: '1:t' };

describe('loadConfig', () => {
  it('has no keepalive by default', () => {
    const c = loadConfig({ ...base, KEEPALIVE_URL: '' });
    expect(c.KEEPALIVE_URL).toBeUndefined();
    expect(c.KEEPALIVE_MINUTES).toBe(9);
    expect(c.SET_WEBHOOK_ON_START).toBe(false);
  });

  it('derives PUBLIC_URL and KEEPALIVE_URL from RENDER_EXTERNAL_URL', () => {
    const c = loadConfig({ ...base, RENDER_EXTERNAL_URL: 'https://ksoz-api.onrender.com', SET_WEBHOOK_ON_START: 'true' });
    expect(c.PUBLIC_URL).toBe('https://ksoz-api.onrender.com');
    expect(c.KEEPALIVE_URL).toBe('https://ksoz-api.onrender.com/health');
    expect(c.SET_WEBHOOK_ON_START).toBe(true);
  });

  it('explicit values win over Render defaults', () => {
    const c = loadConfig({
      ...base,
      RENDER_EXTERNAL_URL: 'https://ksoz-api.onrender.com',
      PUBLIC_URL: 'https://api.ksoz.kz',
      KEEPALIVE_URL: 'https://api.ksoz.kz/health',
    });
    expect(c.PUBLIC_URL).toBe('https://api.ksoz.kz');
    expect(c.KEEPALIVE_URL).toBe('https://api.ksoz.kz/health');
  });
});
