import { useEffect, MutableRefObject } from "react";
import { signInWithCredential, GoogleAuthProvider, User } from "firebase/auth";
import { authPrimary } from "../firebase";

export function useAndroidAuthBridge(userRef: MutableRefObject<User | null>) {
  useEffect(() => {
    // 1. Função centralizada para autenticar o Firebase usando o token nativo
    const autenticarComTokenNativo = async (nativeToken: string) => {
      if (!nativeToken) return;
      console.log("Guarly: Iniciando login no Firebase com token nativo...");
      try {
        const credential = GoogleAuthProvider.credential(nativeToken);
        const userCredential = await signInWithCredential(authPrimary, credential);
        
        if (userCredential.user) {
          console.log("Guarly: Login nativo com Firebase concluído com sucesso!");
          
          if (window.AndroidBridge && typeof window.AndroidBridge.clearPendingToken === "function") {
            window.AndroidBridge.clearPendingToken();
          }
          
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Guarly: Erro ao autenticar credencial nativa no Firebase:", error);
      }
    };

    // 2. FLUXO A: Executa na inicialização do site
    if (window.AndroidBridge && typeof window.AndroidBridge.getPendingToken === "function") {
      const tokenInicial = window.AndroidBridge.getPendingToken();
      if (tokenInicial) {
        autenticarComTokenNativo(tokenInicial);
      }
    }

    // 3. FLUXO B: Ouvinte dinâmico em tempo real
    window.checkPendingToken = async () => {
      if (window.AndroidBridge && typeof window.AndroidBridge.getPendingToken === "function") {
        const tokenNotificado = window.AndroidBridge.getPendingToken();
        if (tokenNotificado) {
          console.log("Guarly: Token pendente encontrado no Android, autenticando...");
          await autenticarComTokenNativo(tokenNotificado);
        }
      }
    };

    // 4. FLUXO C: Backup de injeção direta pelo Android
    window.receiveTokenFromAndroid = async (token: string) => {
      console.log("Guarly: Token injetado diretamente pelo Android.");
      await autenticarComTokenNativo(token);
    };

    // Bridges to receive FCM registration token from native Android WebView
    (window as any).setFCMTokenFromApp = async (fcmToken: string) => {
      console.log("Guarly: FCM Token received from App (WebView):", fcmToken);
      (window as any).isWebViewFCMEnabled = true;

      // Desativar a inicialização do Firebase Messaging Web padrão se estivermos no app
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            if (registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
              registration.unregister();
              console.log("Guarly: Unregistered web service worker because we are inside a WebView.");
            }
          }
        });
      }

      const event = new CustomEvent("fcm_token_received", { detail: fcmToken });
      window.dispatchEvent(event);

      const currentUser = userRef.current;
      if (!currentUser) {
        localStorage.setItem("pending_fcm_token", fcmToken);
        console.log("Guarly: Stored FCM token as pending (no authenticated user yet).");
        return;
      }

      try {
        const { setDoc, doc, serverTimestamp } = await import("firebase/firestore");
        const { dbChat } = await import("../firebase");
        await setDoc(doc(dbChat, "user_fcm_tokens", currentUser.uid), {
          token: fcmToken,
          userId: currentUser.uid,
          userEmail: currentUser.email || "",
          deviceType: "webview",
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Guarly: WebView FCM Token successfully saved to chat database for user:", currentUser.uid);
      } catch (err) {
        console.error("Guarly: Error saving WebView FCM Token to chat database:", err);
      }
    };

    (window as any).receiveFcmTokenFromAndroid = (window as any).setFCMTokenFromApp; // keep fallback
    (window as any).registerFcmToken = (window as any).setFCMTokenFromApp;

    if (window.checkPendingToken) {
      window.checkPendingToken();
    }
    
    const initWebFcmIfNeeded = () => {
      setTimeout(() => {
        if (!(window as any).isWebViewFCMEnabled) {
           console.log("Guarly: Not in a WebView (or App didn't send token). Initializing standard Web FCM.");
           if (userRef.current) {
              import("../utils/appBridge").then(({ requestNativeNotificationPermission }) => {
                 requestNativeNotificationPermission(userRef.current!.uid);
              }).catch(console.error);
           }
        }
      }, 3000);
    };
    initWebFcmIfNeeded();

    const interval = setInterval(() => {
      if (window.checkPendingToken) {
        window.checkPendingToken();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      delete window.receiveTokenFromAndroid;
      delete window.checkPendingToken;
      delete (window as any).setFCMTokenFromApp;
      delete (window as any).receiveFcmTokenFromAndroid;
      delete (window as any).registerFcmToken;
    };
  }, [userRef]);
}
