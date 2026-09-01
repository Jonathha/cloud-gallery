import admin from "firebase-admin";

export let chatAdminApp: admin.app.App | null = null;

export function setChatAdminApp(app: admin.app.App) {
  chatAdminApp = app;
}

export const serverBootTime = Date.now();
export const seenMessageIds = new Set<string>();
