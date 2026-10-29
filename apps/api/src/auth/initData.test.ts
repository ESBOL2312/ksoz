import { describe, expect, it } from 'vitest';
import { signInitData } from '../../test/helpers/initData.js';
import { InitDataInvalid, validateInitData } from './initData.js';

const TOKEN = '123456:test-token';

describe('validateInitData', () => {
  it('accepts valid data and parses user + start_param', () => {
    const raw = signInitData(TOKEN, { user: { id: 42, first_name: 'Айгүл', username: 'aigul' }, startParam: 'ref_7' });
    const r = validateInitData(raw, TOKEN);
    expect(r.user).toMatchObject({ id: 42, first_name: 'Айгүл', username: 'aigul' });
    expect(r.startParam).toBe('ref_7');
  });

  it('rejects wrong token', () => {
    const raw = signInitData(TOKEN);
    expect(() => validateInitData(raw, 'other:token')).toThrow(InitDataInvalid);
  });

  it('rejects tampered payload', () => {
    const raw = signInitData(TOKEN, { user: { id: 1 } }).replace('%22id%22%3A1', '%22id%22%3A2');
    expect(() => validateInitData(raw, TOKEN)).toThrow(/bad_hash/);
  });

  it('rejects missing or malformed hash', () => {
    expect(() => validateInitData('auth_date=1&user=%7B%7D', TOKEN)).toThrow(/malformed/);
    expect(() => validateInitData('hash=zz', TOKEN)).toThrow(/malformed/);
  });

  it('rejects expired auth_date', () => {
    const old = Math.floor(Date.now() / 1000) - 86400 - 10;
    expect(() => validateInitData(signInitData(TOKEN, { authDate: old }), TOKEN)).toThrow(/expired/);
    expect(() => validateInitData(signInitData(TOKEN, { authDate: old }), TOKEN, 90000)).not.toThrow();
  });
});
