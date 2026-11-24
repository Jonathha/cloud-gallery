import * as opaque from "@serenity-kit/opaque";

/**
 * Utilitários de ambiente e instância OPAQUE para o cofre
 */
export function getDB(env) {
  return env.DB || env.DATABASE || env.d1;
}

let cachedServerSetup = null;

export async function getServerSetup(env) {
  if (env && env.OPAQUE_SERVER_SETUP) {
    return env.OPAQUE_SERVER_SETUP;
  }
  if (!cachedServerSetup) {
    await opaque.ready;
    cachedServerSetup = opaque.server.createSetup();
  }
  return cachedServerSetup;
}

export function parseStoredJson(val) {
  if (!val) return null;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
}

export function isVaultRecordLocked(row, now = Date.now()) {
  return Boolean(row && row.locked_until && now < row.locked_until);
}
