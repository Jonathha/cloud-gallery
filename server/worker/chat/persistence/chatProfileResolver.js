import { getChatProfile, saveChatProfile } from "../../../chatGlobalD1.js";
import { isUserAdmin } from "../../../workerLogs/auth.js";
import { profileMemoryCache } from "../chatProfileApi.js";
import { isReservedUsername } from "../chatUsername.js";

/**
 * Resolves or auto-creates chat profile for the authenticated user
 */
export async function resolveChatUserProfile(user, env) {
  let profile = profileMemoryCache.get(user.uid);
  if (profile) {
    return profile;
  }

  profile = await getChatProfile(user.uid, env);
  if (profile) {
    profileMemoryCache.set(user.uid, profile);
    return profile;
  }

  let defaultName = user.email ? user.email.split("@")[0] : `User_${user.uid.slice(0, 5)}`;
  const isAdmin = isUserAdmin(user.email, env, user.email_verified);
  if (!isAdmin && isReservedUsername(defaultName)) {
    defaultName = `User_${user.uid.slice(0, 5)}`;
  }

  profile = await saveChatProfile(user.uid, defaultName, user.email, env);
  if (profile) {
    profileMemoryCache.set(user.uid, profile);
  }
  return profile;
}
