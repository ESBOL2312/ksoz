/** Token bucket: не больше `ratePerSec` сообщений в секунду, общий для процесса. */
export class RateLimiter {
  private tokens: number;
  private last: number;
  private pausedUntil = 0;

  constructor(
    private readonly ratePerSec = 25,
    private readonly nowFn: () => number = Date.now,
    private readonly sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    this.tokens = ratePerSec;
    this.last = nowFn();
  }

  /** Telegram ответил 429: никто не пишет, пока не пройдёт retry_after. */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.nowFn() + ms);
  }

  async take(): Promise<void> {
    for (;;) {
      const now = this.nowFn();
      if (now < this.pausedUntil) {
        await this.sleepFn(this.pausedUntil - now);
        continue;
      }
      this.tokens = Math.min(this.ratePerSec, this.tokens + ((now - this.last) / 1000) * this.ratePerSec);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await this.sleepFn(Math.ceil(((1 - this.tokens) / this.ratePerSec) * 1000));
    }
  }
}
