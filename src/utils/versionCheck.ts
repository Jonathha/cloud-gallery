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

  const cleanCur = currV ? currV.toLowerCase().replace(/^v/, '').trim() : '';
  const cleanReq = reqV ? reqV.toLowerCase().replace(/^v/, '').trim() : '';

  // 1. Compare version name (semantic comparison)
  if (cleanCur && cleanReq) {
    const currParts = cleanCur.split('.').map((p) => parseInt(p, 10) || 0);
    const reqParts = cleanReq.split('.').map((p) => parseInt(p, 10) || 0);
    const maxLen = Math.max(currParts.length, reqParts.length);

    for (let i = 0; i < maxLen; i++) {
      const c = currParts[i] || 0;
      const r = reqParts[i] || 0;
      if (c < r) {
        return true; // Running version is strictly older
      }
      if (c > r) {
        return false; // Running version is strictly newer!
      }
    }

    // Versions are semantically equal:
    // Only compare build numbers if BOTH are explicitly present and distinct
    if (currBuild && reqBuild) {
      const curB = parseInt(currBuild, 10);
      const reqB = parseInt(reqBuild, 10);
      if (!isNaN(curB) && !isNaN(reqB)) {
        return curB < reqB;
      }
    }

    return false;
  }

  // 2. Fallback to build number comparison if version strings were not both provided
  if (currBuild && reqBuild) {
    const curB = parseInt(currBuild, 10);
    const reqB = parseInt(reqBuild, 10);
    if (!isNaN(curB) && !isNaN(reqB)) {
      return curB < reqB;
    }
  }

  // If only reqV is provided and currV is completely missing
  if (cleanReq && !cleanCur) {
    return true;
  }

  return false;
}

