import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// 1. New user-provided Firebase configuration (Primary)
const newFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0718492200.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0718492200",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0718492200.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "552951184679",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:552951184679:web:2dadc140f51f2fafaffd02"
};

// Initialize Primary Apps (New Database)
const appPrimary = initializeApp(newFirebaseConfig, 'primary');

// Use initializeAuth with fallback persistence for WebView compatibility
export const authPrimary = initializeAuth(appPrimary, {
  persistence: [browserLocalPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Enable Firestore multi-tab offline persistent local cache
export const dbPrimary = initializeFirestore(appPrimary, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Chat-specific secondary Firebase configuration
const chatFirebaseConfig = {
  apiKey: "AIzaSyCkLaRiXXoT2i0O_vffq94JOl-tOkWrH6I",
  authDomain: "chat-809dc.firebaseapp.com",
  projectId: "chat-809dc",
  storageBucket: "chat-809dc.firebasestorage.app",
  messagingSenderId: "587688988302",
  appId: "1:587688988302:web:533c4581d5e4d4843c43df",
  measurementId: "G-888H7XC2CY"
};

const appChat = initializeApp(chatFirebaseConfig, 'chat');
export const authChat = initializeAuth(appChat, {
  persistence: [browserLocalPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const dbChat = initializeFirestore(appChat, {});


export let messagingChat: any = null;
try {
  messagingChat = getMessaging(appChat);
} catch (e) { console.warn('Messaging not supported', e); }

// Dedicated Logs & Security Firebase configuration (gen-lang-client-0718492200)
const logsFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0718492200.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0718492200",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0718492200.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "552951184679",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:552951184679:web:2dadc140f51f2fafaffd02"
};

const appLogs = initializeApp(logsFirebaseConfig, 'logs');
export const dbLogs = initializeFirestore(appLogs, {});
