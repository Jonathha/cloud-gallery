/**
 * Compares the running app's version and build number against the required/latest ones.
 * Returns true if an update is required (running version or build is older than required).
 */
export function isVersionOlder(
  currV?: string | null,
  currBuild?: string | null,
  reqV?: string | null,
  reqBuild?: string | null
): boolean {
  if (!reqV && !reqBuild) return false;

  let versionIsOlder = false;
  let buildIsOlder = false;

  // 1. Compare version name (semantic comparison)
  if (currV && reqV) {
    const cleanCur = currV.toLowerCase().replace(/^v/, '').trim();
    const cleanReq = reqV.toLowerCase().replace(/^v/, '').trim();

    if (cleanCur !== cleanReq) {
      const currParts = cleanCur.split('.').map(Number);
      const reqParts = cleanReq.split('.').map(Number);

      for (let i = 0; i < Math.max(currParts.length, reqParts.length); i++) {
        const c = currParts[i] || 0;
        const r = reqParts[i] || 0;
        if (c < r) {
          versionIsOlder = true;
          break;
        }
        if (c > r) {
          versionIsOlder = false;
          break;
        }
      }
    }
  }

  // 2. Compare build number (numerical comparison)
  if (currBuild && reqBuild) {
    const curB = Number(currBuild);
    const reqB = Number(reqBuild);
    if (!isNaN(curB) && !isNaN(reqB)) {
      if (curB < reqB) {
        buildIsOlder = true;
      }
    }
  }

  // An update is required if either the running version is older OR the running build is older
  return versionIsOlder || buildIsOlder;
}

