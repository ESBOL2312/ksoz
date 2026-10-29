import { createHmac } from 'node:crypto';

export interface SignOptions {
  user?: { id: number; first_name?: string; username?: string };
  startParam?: string;
  authDate?: number;
}

/** Строит корректно подписанную строку initData, как это делает Telegram. */
export function signInitData(botToken: string, opts: SignOptions = {}): string {
  const user = { first_name: 'Test', ...(opts.user ?? { id: 1001 }) };
  const params: Record<string, string> = {
    auth_date: String(opts.authDate ?? Math.floor(Date.now() / 1000)),
    query_id: 'AAHtest',
    user: JSON.stringify(user),
  };
  if (opts.startParam) params.start_param = opts.startParam;

  const dcs = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dcs).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

export const tmaHeader = (botToken: string, opts?: SignOptions) => ({
  authorization: `tma ${signInitData(botToken, opts)}`,
});
