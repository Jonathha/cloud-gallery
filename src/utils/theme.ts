export type AppTheme = 'dark' | 'light';

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('app_theme');
    return saved === 'light' ? 'light' : 'dark';
  } catch (e) {
    return 'dark';
  }
}

export function applyTheme(theme: AppTheme) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('app_theme', theme);
  } catch (e) {}
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    root.classList.add('light', 'theme-light');
    root.style.backgroundColor = '#f8fafc';
    root.style.color = '#0f172a';
    if (document.body) {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  } else {
    root.setAttribute('data-theme', 'dark');
    root.classList.remove('light', 'theme-light');
    root.classList.add('dark');
    root.style.backgroundColor = '#000000';
    root.style.color = '#ffffff';
    if (document.body) {
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';
    }
  }
  window.dispatchEvent(new Event('app-theme-changed'));
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}
