export const WORKER_BASE_URL = "https://secure-vault-backend.jogonesteterp.workers.dev";

/**
 * Returns the base URL for backend API requests.
 * Uses `import.meta.env.VITE_API_URL` if explicitly set to a valid http/https URL.
 * Otherwise defaults to WORKER_BASE_URL ("https://secure-vault-backend.jogonesteterp.workers.dev").
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return WORKER_BASE_URL;
}

/**
 * Constructs a full API URL given an endpoint path or relative URL.
 * Example: getApiUrl('/api/storage/image/123') => 'https://secure-vault-backend.jogonesteterp.workers.dev/api/storage/image/123'
 */
export function getApiUrl(path: string = ''): string {
  if (!path) return getApiBaseUrl();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${cleanPath}`;
}

