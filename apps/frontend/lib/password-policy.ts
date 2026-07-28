export const WEAK_PASSWORDS = [
  'password',
  'password123',
  'password1',
  '12345678',
  '123456789',
  'qwerty123',
  'demo1234',
  'admin123',
  'letmein1',
] as const;

export const WEAK_PASSWORD_MESSAGE =
  'このパスワードはよく知られた弱いパスワードです。別のパスワードを設定してください';

export function isWeakPassword(password: string): boolean {
  return WEAK_PASSWORDS.includes(password.toLowerCase() as (typeof WEAK_PASSWORDS)[number]);
}
