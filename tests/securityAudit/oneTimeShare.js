import assert from "node:assert";
import { getShareForViewD1 } from "../../server/workerD1Shares.js";
import { createMockD1, createInitialShareRow } from "./oneTimeShareMock.js";
import { assertFirstViewAndRace, assertRetryAndExpiry } from "./oneTimeShareCases.js";

// Keep the main test readable by delegating the mock and scenario assertions.
// The assertions remain sequential inside the same registered test.
export async function runOneTimeShareTest(test) {
  await test("8. Compartilhamento de uso único garante janela de 60s para mesmo IP e bloqueia invasor/expiração", async () => {
    const { store, dbMock } = createMockD1();
    const shareId = "one-time-test-share";
    const initialRow = createInitialShareRow(shareId);
    store.set(shareId, { ...initialRow });
    const legitimateIp = "200.50.10.1";
    const attackerIp = "198.51.100.99";

    const missingIpId = "one-time-missing-ip";
    store.set(missingIpId, { ...initialRow, id: missingIpId });
    assert.strictEqual(await getShareForViewD1(dbMock, missingIpId, null), null);
    assert.strictEqual(store.get(missingIpId).first_viewed_at, null);
    assert.strictEqual(store.get(missingIpId).view_count, 0);

    const sentinelIpId = "one-time-sentinel-ip";
    store.set(sentinelIpId, { ...initialRow, id: sentinelIpId });
    assert.strictEqual(await getShareForViewD1(dbMock, sentinelIpId, "0.0.0.0"), null);
    assert.strictEqual(store.get(sentinelIpId).first_viewed_at, null);
    assert.strictEqual(store.get(sentinelIpId).view_count, 0);

    await assertFirstViewAndRace(store, dbMock, initialRow, shareId, legitimateIp, attackerIp);
    await assertRetryAndExpiry(store, dbMock, shareId, legitimateIp, attackerIp);
  });
}
