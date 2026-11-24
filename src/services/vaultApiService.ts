import { User } from "firebase/auth";
import { getApiUrl } from "../utils/apiUrl";
import { getSafeAuthToken } from "../utils/safeAuthToken";

async function getAuthHeader(user?: any): Promise<Record<string, string>> {
  const token = await getSafeAuthToken(user);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function fetchVaultConfigApi(user: User) {
  if (!user) return null;
  try {
    const headers = await getAuthHeader(user);
    if (!headers.Authorization) return null;
    const res = await fetch(getApiUrl("/api/vault/config"), { headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`[HTTP_${res.status}] Falha ao consultar cofre: ${errText || res.statusText}`);
    }
    const data = await res.json();
    return data.config || null;
  } catch (err) {
    console.warn("[vaultApiService] Error fetching vault config:", err);
    throw err;
  }
}

export async function opaqueRegisterInitApi(user: User, registrationRequest: string) {
  if (!user || !registrationRequest) return null;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/opaque/register-init"), {
      method: "POST",
      headers,
      body: JSON.stringify({ registrationRequest })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[vaultApiService] Error in opaqueRegisterInitApi:", err);
    return null;
  }
}

export async function opaqueRegisterFinishApi(user: User, payload: any) {
  if (!user || !payload) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/opaque/register-finish"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error in opaqueRegisterFinishApi:", err);
    return false;
  }
}

export async function opaqueLoginInitApi(user: User, startLoginRequest: string) {
  if (!user || !startLoginRequest) return null;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/opaque/login-init"), {
      method: "POST",
      headers,
      body: JSON.stringify({ startLoginRequest })
    });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err) {
    console.warn("[vaultApiService] Error in opaqueLoginInitApi:", err);
    return null;
  }
}

export async function opaqueLoginFinishApi(user: User, payload: any) {
  if (!user || !payload) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/opaque/login-finish"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { success: !!data.success, data };
  } catch (err) {
    console.warn("[vaultApiService] Error in opaqueLoginFinishApi:", err);
    return { success: false, data: null };
  }
}

export async function saveVaultSetupApi(user: User, payload: any) {
  if (!user) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/setup"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error saving vault setup:", err);
    return false;
  }
}

export async function recordVaultPenaltyApi(user: User, isIntrusion = false) {
  if (!user) return null;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/penalty"), {
      method: "POST",
      headers,
      body: JSON.stringify({ isIntrusion })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      failedAttempts: typeof data.failedAttempts === "number" ? data.failedAttempts : null,
      lockedUntil: data.lockedUntil || null
    };
  } catch (err) {
    console.warn("[vaultApiService] Error recording vault penalty:", err);
    return null;
  }
}

export async function resetVaultPenaltyApi(user: User) {
  if (!user) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/reset-penalty"), {
      method: "POST",
      headers
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error resetting vault penalty:", err);
    return false;
  }
}

export async function updateVaultSettingsApi(user: User, settings: any) {
  if (!user) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/settings"), {
      method: "POST",
      headers,
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error updating vault settings:", err);
    return false;
  }
}

export async function getMediaKeyApi(user: User, imageId: string) {
  if (!user || !imageId) return null;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl(`/api/vault/media-key/${imageId}`), { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.key || null;
  } catch (err) {
    console.warn("[vaultApiService] Error getting media key:", err);
    return null;
  }
}

export async function saveMediaKeyApi(user: User, keyData: any) {
  if (!user || !keyData?.imageId) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/vault/media-key"), {
      method: "POST",
      headers,
      body: JSON.stringify(keyData)
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error saving media key:", err);
    return false;
  }
}

export async function deleteMediaKeyApi(user: User, imageId: string) {
  if (!user || !imageId) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl(`/api/vault/media-key/${imageId}`), {
      method: "DELETE",
      headers
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error deleting media key:", err);
    return false;
  }
}

export async function fetchAppConfigApi() {
  try {
    const res = await fetch(getApiUrl("/api/config/app"));
    if (!res.ok) return null;
    const data = await res.json();
    return data.config || null;
  } catch (err) {
    console.warn("[vaultApiService] Error fetching app config:", err);
    return null;
  }
}

export async function saveAppConfigApi(user: User, configData: any) {
  if (!user) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/config/app"), {
      method: "POST",
      headers,
      body: JSON.stringify(configData)
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error saving app config:", err);
    return false;
  }
}

export async function registerDeviceTokenApi(user: User, token: string, platform = "android") {
  if (!user || !token) return false;
  try {
    const headers = await getAuthHeader(user);
    const res = await fetch(getApiUrl("/api/user/devices"), {
      method: "POST",
      headers,
      body: JSON.stringify({ token, platform })
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("[vaultApiService] Error registering device token:", err);
    return false;
  }
}
