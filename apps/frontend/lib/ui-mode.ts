export type UiMode = 'compact' | 'full';

export const UI_MODE_KEY = 'medicalOsUiMode';

export function readUiMode(): UiMode {
  if (typeof window === 'undefined') return 'compact';
  const stored = localStorage.getItem(UI_MODE_KEY);
  return stored === 'full' ? 'full' : 'compact';
}

export function writeUiMode(mode: UiMode) {
  localStorage.setItem(UI_MODE_KEY, mode);
}
