/** CLINICS 全画面の右下に置く補助パネル用のウィンドウ寸法・位置 */

export const PANEL_WINDOW_NAME = 'medicalOsPanel';

type ScreenEx = Screen & { availLeft?: number; availTop?: number };

export function getPanelWindowBounds() {
  const screen = window.screen as ScreenEx;
  const availLeft = screen.availLeft ?? 0;
  const availTop = screen.availTop ?? 0;
  const availWidth = screen.availWidth || screen.width;
  const availHeight = screen.availHeight || screen.height;

  // 画面の右下 1/4（幅1/2 × 高さ1/2）
  const width = Math.max(380, Math.round(availWidth / 2));
  const height = Math.max(520, Math.round(availHeight / 2));
  const left = availLeft + Math.max(0, availWidth - width);
  const top = availTop + Math.max(0, availHeight - height);

  return { width, height, left, top };
}

function panelWindowFeatures() {
  const { width, height, left, top } = getPanelWindowBounds();
  return [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}

function applyBounds(target: Window) {
  const { width, height, left, top } = getPanelWindowBounds();
  try {
    target.resizeTo(width, height);
  } catch {
    /* ignore */
  }
  try {
    target.moveTo(left, top);
  } catch {
    /* ignore */
  }
}

/** リサイズが効くまで短間隔で再試行（Chrome 対策） */
export function snapToPanelWindow(target: Window = window): boolean {
  if (typeof window === 'undefined') return false;
  try {
    target.name = PANEL_WINDOW_NAME;
  } catch {
    /* ignore */
  }
  applyBounds(target);
  [50, 150, 300, 600].forEach((ms) => {
    window.setTimeout(() => applyBounds(target), ms);
  });
  return true;
}

/** フル画面作業用にウィンドウをほぼ全面に広げる */
export function expandToFullWindow(): boolean {
  if (typeof window === 'undefined') return false;
  const screen = window.screen as ScreenEx;
  const availLeft = screen.availLeft ?? 0;
  const availTop = screen.availTop ?? 0;
  const availWidth = screen.availWidth || screen.width;
  const availHeight = screen.availHeight || screen.height;
  try {
    window.moveTo(availLeft, availTop);
    window.resizeTo(availWidth, availHeight);
    return true;
  } catch {
    return false;
  }
}

/**
 * 「パネルにする」用。
 * ユーザー操作の直後に右下 1/4 のポップアップを開く（通常タブの resize 制限を回避）。
 * 戻り値: 同じウィンドウで続ける場合 true（router.push が必要）
 */
export function openAsPanelWindow(path = '/panel'): boolean {
  if (typeof window === 'undefined') return true;

  const { width, height, left, top } = getPanelWindowBounds();
  const absUrl = new URL(path, window.location.origin).toString();

  // 名前付きウィンドウを features 付きで開く（既存ならフォーカス＋遷移）
  const popup = window.open(absUrl, PANEL_WINDOW_NAME, panelWindowFeatures());

  if (!popup) {
    // ポップアップブロック時: 同一タブで遷移し、ベストエフォートでリサイズ
    window.alert(
      'ポップアップがブロックされました。ブラウザで許可するか、このウィンドウを手動で右下に配置してください。',
    );
    snapToPanelWindow(window);
    return true;
  }

  try {
    popup.name = PANEL_WINDOW_NAME;
  } catch {
    /* ignore */
  }

  snapToPanelWindow(popup);
  try {
    popup.focus();
  } catch {
    /* ignore */
  }

  // 同一ウィンドウ（すでにパネル名の場合など）
  if (popup === window) {
    try {
      window.resizeTo(width, height);
      window.moveTo(left, top);
    } catch {
      /* ignore */
    }
    return true;
  }

  // 別ウィンドウが開けた → 元タブは閉じを試みる（失敗しても可）
  window.setTimeout(() => {
    try {
      window.close();
    } catch {
      /* ignore */
    }
  }, 100);

  return false;
}
