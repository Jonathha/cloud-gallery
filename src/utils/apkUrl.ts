import { AppConfig } from '../hooks/appUpdate/types';

export const DEFAULT_PUBLIC_APK_URL = 'https://pub-822d342550ca446b9e7a5974089360b5.r2.dev/Guarly.apk';

/**
 * Resolves the APK download URL configured by the admin in the Admin Panel / Firestore.
 * Fallbacks cleanly to DEFAULT_PUBLIC_APK_URL if empty or if invalid private R2 domain.
 */
export function resolveApkUrl(apkUrlFromConfig?: string | null): string {
  if (apkUrlFromConfig && typeof apkUrlFromConfig === 'string' && apkUrlFromConfig.trim() !== '') {
    const cleaned = apkUrlFromConfig.trim();
    // Convert old private R2 endpoint if present
    if (cleaned.includes('.r2.cloudflarestorage.com')) {
      return DEFAULT_PUBLIC_APK_URL;
    }
    return cleaned;
  }
  return DEFAULT_PUBLIC_APK_URL;
}
