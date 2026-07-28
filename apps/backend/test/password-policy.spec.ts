import { isWeakPassword, WEAK_PASSWORD_MESSAGE } from '../src/modules/auth/password-policy';

describe('password-policy', () => {
  it('rejects known weak passwords', () => {
    expect(isWeakPassword('password123')).toBe(true);
    expect(isWeakPassword('PASSWORD123')).toBe(true);
    expect(isWeakPassword('12345678')).toBe(true);
  });

  it('accepts strong passwords', () => {
    expect(isWeakPassword('KushimaPilot2026!')).toBe(false);
  });

  it('exposes a user-facing message', () => {
    expect(WEAK_PASSWORD_MESSAGE).toContain('弱いパスワード');
  });
});
