/**
 * Тонкая обёртка над window.Telegram.WebApp (скрипт telegram-web-app.js из index.html).
 * Типы описывают только то, что использует миниапп.
 */

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotification = 'error' | 'success' | 'warning';

interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name: string; username?: string; language_code?: string };
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  enableVerticalSwipes?(): void;
  openTelegramLink(url: string): void;
  openLink(url: string): void;
  onEvent(event: string, cb: () => void): void;
  offEvent(event: string, cb: () => void): void;
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: HapticImpact): void;
    notificationOccurred(type: HapticNotification): void;
    selectionChanged(): void;
  };
  CloudStorage: {
    getItem(key: string, cb: (err: string | null, value?: string) => void): void;
    setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** WebApp, если миниапп открыт внутри Telegram (initData не пустая). */
export function getWebApp(): TelegramWebApp | null {
  const wa = window.Telegram?.WebApp;
  return wa && wa.initData ? wa : null;
}

/** Фон приложения в светлой и тёмной теме (совпадает с --k-canvas в main.css). */
export const CANVAS = { light: '#F2F4F7', dark: '#0D1720' } as const;

/**
 * Светлая или тёмная тема: в Telegram — по теме клиента, вне его — по системной настройке.
 * HIG: приложение следует выбранному оформлению, а не навязывает своё.
 */
export function applyColorScheme(wa: TelegramWebApp | null = getWebApp()) {
  const scheme = wa
    ? wa.colorScheme
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  document.documentElement.classList.toggle('dark', scheme === 'dark');
  if (!wa) return;
  try {
    if (wa.isVersionAtLeast('6.1')) {
      wa.setHeaderColor(CANVAS[scheme]);
      wa.setBackgroundColor(CANVAS[scheme]);
    }
    if (wa.isVersionAtLeast('7.10')) wa.setBottomBarColor?.(CANVAS[scheme]);
  } catch {
    /* старые клиенты */
  }
}

/** Вызывается один раз при старте. */
export function initWebApp(): TelegramWebApp | null {
  const wa = getWebApp();
  if (!wa) {
    applyColorScheme(null);
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyColorScheme(null));
    return null;
  }
  wa.ready();
  wa.expand();
  applyColorScheme(wa);
  wa.onEvent('themeChanged', () => applyColorScheme(wa));
  applySafeArea(wa);
  wa.onEvent('safeAreaChanged', () => applySafeArea(wa));
  wa.onEvent('contentSafeAreaChanged', () => applySafeArea(wa));
  return wa;
}

function applySafeArea(wa: TelegramWebApp) {
  const top = (wa.safeAreaInset?.top ?? 0) + (wa.contentSafeAreaInset?.top ?? 0);
  const bottom = (wa.safeAreaInset?.bottom ?? 0) + (wa.contentSafeAreaInset?.bottom ?? 0);
  const root = document.documentElement.style;
  if (top) root.setProperty('--tg-safe-top', `${top}px`);
  if (bottom) root.setProperty('--tg-safe-bottom', `${bottom}px`);
}

export function supports(version: string): boolean {
  const wa = getWebApp();
  return !!wa && wa.isVersionAtLeast(version);
}

/** CloudStorage с запасным localStorage (вне Telegram и на старых клиентах). */
export function cloudGet(key: string): Promise<string | null> {
  const wa = getWebApp();
  if (!wa || !wa.isVersionAtLeast('6.9')) return Promise.resolve(safeLocal(() => localStorage.getItem(key)));
  return new Promise((resolve) => wa.CloudStorage.getItem(key, (err, v) => resolve(err ? null : (v || null))));
}

export function cloudSet(key: string, value: string): Promise<void> {
  const wa = getWebApp();
  if (!wa || !wa.isVersionAtLeast('6.9')) {
    safeLocal(() => localStorage.setItem(key, value));
    return Promise.resolve();
  }
  return new Promise((resolve) => wa.CloudStorage.setItem(key, value, () => resolve()));
}

export function safeLocal<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
