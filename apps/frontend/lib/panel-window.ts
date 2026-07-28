/** CLINICS 全画面の右下に置く補助パネル用のウィンドウ寸法・位置 */

export const PANEL_WINDOW_NAME = 'medicalOsPanel';

export function getPanelWindowBounds() {
  const availLeft = window.screen.availLeft ?? 0;
  const availTop = window.screen.availTop ?? 0;
  const availWidth = window.screen.availWidth || window.screen.width;
  const availHeight = window.screen.availHeight || window.screen.height;

  // 画面の右下 1/4（幅1/2 × 高さ1/2）
  const width = Math.max(360, Math.round(availWidth / 2));
  const height = Math.max(480, Math.round(availHeight / 2));
  const left = availLeft + availWidth - width;
  const top = availTop + availHeight - height;

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

/** 現在のウィンドウを画面右下 1/4 にスナップする（ユーザー操作の直後に呼ぶ） */
export function snapToPanelWindow(): boolean {
  if (typeof window === 'undefined') return false;
  const { width, height, left, top } = getPanelWindowBounds();
  try {
    window.resizeTo(width, height);
    window.moveTo(left, top);
    return true;
  } catch {
    return false;
  }
}

/** フル画面作業用にウィンドウをほぼ全面に広げる */
export function expandToFullWindow(): boolean {
  if (typeof window === 'undefined') return false;
  const availLeft = window.screen.availLeft ?? 0;
  const availTop = window.screen.availTop ?? 0;
  const availWidth = window.screen.availWidth || window.screen.width;
  const availHeight = window.screen.availHeight || window.screen.height;
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
 * - 既にパネルウィンドウならリサイズのみ
 * - それ以外は右下 1/4 のポップアップで /panel を開き、元ウィンドウは閉じを試みる
 * 戻り値: パネル側で同じウィンドウを使い続けた場合 true（呼び出し側で router.push が必要）
 */
export function openAsPanelWindow(path = '/panel'): boolean {
  if (typeof window === 'undefined') return true;

  const { width, height, left, top } = getPanelWindowBounds();

  if (window.name === PANEL_WINDOW_NAME) {
    snapToPanelWindow();
    return true;
  }

  const popup = window.open(path, PANEL_WINDOW_NAME, panelWindowFeatures());
  if (popup) {
    try {
      popup.focus();
      popup.resizeTo(width, height);
      popup.moveTo(left, top);
    } catch {
      /* 一部ブラウザは open 時の features のみ有効 */
    }
    if (popup !== window) {
      window.close();
      return false;
    }
  }

  snapToPanelWindow();
  return true;
}
