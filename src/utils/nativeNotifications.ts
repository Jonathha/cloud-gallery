/**
 * Utility to manage and dispatch native push notifications
 * using the JavaScript bridges provided by the Android native container wrapper.
 * 
 * Injected bridges on window:
 * - window.AndroidBridge
 * - window.GuarlyApp
 * - window.GuarlyNativeBridge
 */

export function getNativeBridges() {
  const win = window as any;
  const bridges: any[] = [];
  
  if (win.AndroidBridge) bridges.push(win.AndroidBridge);
  if (win.GuarlyApp) bridges.push(win.GuarlyApp);
  if (win.GuarlyNativeBridge) bridges.push(win.GuarlyNativeBridge);
  
  return bridges;
}

/**
 * Checks if running inside the Android container with active bridges.
 */
export function isAndroidNativeContainer(): boolean {
  return getNativeBridges().length > 0;
}

/**
 * Safely requests notification permission through the native app wrapper.
 */
export function requestNativeNotificationPermission(): void {
  console.log('[NativeNotifications] System completely deactivated by design.');
}

/**
 * Sends a native push notification with a title and message.
 */
export function sendNativeNotification(title: string, message: string): void {
  console.log('[NativeNotifications] Push notifications completely deactivated: debug prevented notification:', { title, message });
}

/**
 */
export function startNativeBackgroundChatListener(userId: string): void {
}

/**
 */
export function stopNativeBackgroundChatListener(): void {
}
