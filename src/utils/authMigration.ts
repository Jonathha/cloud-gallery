import { User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { dbPrimary } from "../firebase";
import { migrateIndexedDBKeys } from "./db";
import { getApiUrl } from "./apiUrl";

export async function checkForMigration(currentUser: User): Promise<void> {
  if (!currentUser.email) return;
  try {
    const emailLower = currentUser.email.toLowerCase().trim();
    let oldUserId: string | null = null;
    let oldData: any = null;

    // 1. Check local storage for old user id from offline_user
    const offlineUserStr = localStorage.getItem("offline_user");
    if (offlineUserStr) {
      try {
        const offlineUser = JSON.parse(offlineUserStr);
        if (offlineUser && offlineUser.uid && offlineUser.uid !== currentUser.uid && offlineUser.email?.toLowerCase().trim() === emailLower) {
          console.log("[Migration] Found old user ID in offline_user storage:", offlineUser.uid);
          oldUserId = offlineUser.uid;
        }
      } catch (e) {
        console.warn("[Migration] Failed parsing offline_user storage:", e);
      }
    }

    // 1b. If not in offline_user, search all keys in local storage starting with vault_data_
    if (!oldUserId) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("vault_data_")) {
          const uid = key.replace("vault_data_", "");
          if (uid !== currentUser.uid) {
            try {
              const docSnap = await getDoc(doc(dbPrimary, "users", uid));
              if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.email?.toLowerCase().trim() === emailLower) {
                  console.log("[Migration] Found matching old user ID from vault_data_ key:", uid);
                  oldUserId = uid;
                  oldData = data;
                  break;
                }
              }
            } catch (e) {
              console.warn(`[Migration] Failed querying candidate doc users/${uid}:`, e);
            }
          }
        }
      }
    }

    // 1c. If we found oldUserId but don't have oldData, fetch it
    if (oldUserId && !oldData) {
      try {
        const docSnap = await getDoc(doc(dbPrimary, "users", oldUserId));
        if (docSnap.exists()) {
          oldData = docSnap.data();
        }
      } catch (e) {
        console.warn(`[Migration] Failed fetching doc for oldUserId ${oldUserId}:`, e);
      }
    }

    // 2. Fallback to querying the collections if we couldn't find any old user ID locally
    if (!oldUserId) {
      try {
        const q = query(collection(dbPrimary, "users"), where("email", "==", emailLower));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((d) => {
          if (d.id !== currentUser.uid) {
            oldUserId = d.id;
            oldData = d.data();
          }
        });
      } catch (queryErr: any) {
        if (queryErr.code === "permission-denied") {
          console.log("[Migration] Collection query restricted by Firebase security rules. Proceeding without remote fallback.");
        } else {
          console.warn("[Migration] Query error:", queryErr);
        }
      }
    }

    // 3. If we found a legacy account, run the migration!
    if (oldUserId && oldData) {
      console.log(`[Migration] Starting migration of legacy account ${oldUserId} to ${currentUser.uid}...`);
      
      // 1. Create the new user doc
      await setDoc(doc(dbPrimary, "users", currentUser.uid), {
        ...oldData,
        email: emailLower,
      });

      // 2. Migrate LocalStorage vault_data
      const cachedVaultData = localStorage.getItem(`vault_data_${oldUserId}`);
      if (cachedVaultData) {
        localStorage.setItem(`vault_data_${currentUser.uid}`, cachedVaultData);
        localStorage.removeItem(`vault_data_${oldUserId}`);
      }

      // 3. Migrate IndexedDB CryptoKey
      try {
        await migrateIndexedDBKeys(oldUserId, currentUser.uid);
      } catch (dbErr) {
        console.error("[Migration] Error migrating IndexedDB keys:", dbErr);
      }

      // 4. Migrate backend files
      let migratedImageIds: string[] = [];
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch(getApiUrl("/api/auth/migrate-user"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ oldUserId, newUserId: currentUser.uid }),
        });
        if (!res.ok) {
          console.error("[Migration] Backend migration returned non-ok status:", res.status);
        } else {
          const resData = await res.json();
          console.log(`[Migration] Backend migration success. Count:`, resData.migratedCount);
          migratedImageIds = resData.migratedImageIds || [];
        }
      } catch (fetchErr) {
        console.error("[Migration] Error calling migrate-user endpoint:", fetchErr);
      }

      // 5. Migrate media_keys collection in Firestore using the list of image IDs
      const mediaKeysToMigrate = new Set<string>(migratedImageIds);
      
      try {
        const mediaKeysQuery = query(collection(dbPrimary, "media_keys"), where("userId", "==", oldUserId));
        const mediaKeysSnapshot = await getDocs(mediaKeysQuery);
        for (const mediaKeyDoc of mediaKeysSnapshot.docs) {
          mediaKeysToMigrate.add(mediaKeyDoc.id);
        }
      } catch (mediaQueryErr: any) {
        console.log("[Migration] Media keys collection query restricted. Proceeding with backend file IDs list.");
      }

      for (const keyId of mediaKeysToMigrate) {
        try {
          const mediaKeyDoc = await getDoc(doc(dbPrimary, "media_keys", keyId));
          if (mediaKeyDoc.exists()) {
            const mediaKeyData = mediaKeyDoc.data();
            await setDoc(doc(dbPrimary, "media_keys", keyId), {
              ...mediaKeyData,
              userId: currentUser.uid,
            });
            if (mediaKeyData.userId === oldUserId) {
              await deleteDoc(doc(dbPrimary, "media_keys", keyId));
            }
          }
        } catch (keyErr) {
          console.warn(`[Migration] Failed migrating media key ${keyId}:`, keyErr);
        }
      }

      // 6. Delete old user document
      try {
        await deleteDoc(doc(dbPrimary, "users", oldUserId));
      } catch (delErr) {
        console.warn("[Migration] Could not delete old user document (may have insufficient permission):", delErr);
      }

      console.log("[Migration] Migration completed successfully!");
    }
  } catch (err) {
    console.warn("[Migration] Handled error during migration process:", err);
  }
}
