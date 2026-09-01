importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const chatFirebaseConfig = {
  apiKey: "AIzaSyCkLaRiXXoT2i0O_vffq94JOl-tOkWrH6I",
  authDomain: "chat-809dc.firebaseapp.com",
  projectId: "chat-809dc",
  storageBucket: "chat-809dc.firebasestorage.app",
  messagingSenderId: "587688988302",
  appId: "1:587688988302:web:533c4581d5e4d4843c43df"
};

try {
  firebase.initializeApp(chatFirebaseConfig);
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || payload.data?.userName || 'Nova Mensagem';
    const notificationOptions = {
      body: payload.notification?.body || 'Você recebeu uma nova mensagem',
      icon: '/icon.png',
      data: payload.data,
    };
  
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.log("Failed to initialize Firebase Messaging SW:", err);
}
