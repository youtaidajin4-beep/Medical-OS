const WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  'password1',
  '12345678',
  '123456789',
  'qwerty123',
  'demo1234',
  'admin123',
  'letmein1',
]);

export function isWeakPassword(password: string): boolean {
  return WEAK_PASSWORDS.has(password.toLowerCase());
}

export const WEAK_PASSWORD_MESSAGE =
  'このパスワードはよく知られた弱いパスワードです。別のパスワードを設定してください';
