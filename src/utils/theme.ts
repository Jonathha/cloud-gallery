export type AppTheme = 'dark' | 'light';

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('app_theme');
  return saved === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: AppTheme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_theme', theme);
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    root.classList.add('light', 'theme-light');
  } else {
    root.setAttribute('data-theme', 'dark');
    root.classList.remove('light', 'theme-light');
  }
  window.dispatchEvent(new Event('app-theme-changed'));
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}
