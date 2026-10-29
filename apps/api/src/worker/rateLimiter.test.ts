import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rateLimiter.js';

describe('RateLimiter', () => {
  it('never exceeds the rate: 100 takes need >= 3s of virtual time at 25/s', async () => {
    let t = 0;
    const lim = new RateLimiter(25, () => t, async (ms) => void (t += ms));
    for (let i = 0; i < 100; i++) await lim.take();
    expect(t).toBeGreaterThanOrEqual(2900); // первые 25 — burst
    expect(t).toBeLessThan(3300);
  });
  it('pause blocks until retry_after has passed', async () => {
    let t = 0;
    const lim = new RateLimiter(25, () => t, async (ms) => void (t += ms));
    lim.pause(2000);
    await lim.take();
    expect(t).toBeGreaterThanOrEqual(2000);
  });
});
