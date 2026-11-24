import assert from "node:assert";
import { getShareForViewD1 } from "../../server/workerD1Shares.js";

export async function assertFirstViewAndRace(store, dbMock, initialRow, shareId, legitimateIp, attackerIp) {
  const firstLoad = await getShareForViewD1(dbMock, shareId, legitimateIp);
  assert.ok(firstLoad, "Primeiro acesso deve ser retornado com sucesso");
  assert.strictEqual(firstLoad.isOneTime, true);
  assert.strictEqual(firstLoad.firstViewerIp, legitimateIp);
  assert.ok(firstLoad.firstViewedAt);
  assert.strictEqual(await getShareForViewD1(dbMock, shareId, null), null);
  assert.strictEqual(await getShareForViewD1(dbMock, shareId, "0.0.0.0"), null);
  assert.ok(await getShareForViewD1(dbMock, shareId, legitimateIp));

  const raceId = "one-time-race-share";
  store.set(raceId, { ...initialRow, id: raceId, first_viewed_at: null, first_viewer_ip: null, view_count: 0, status: "active" });
  const results = await Promise.all([
    getShareForViewD1(dbMock, raceId, legitimateIp),
    getShareForViewD1(dbMock, raceId, attackerIp),
  ]);
  assert.strictEqual(results.filter(Boolean).length, 1, "Apenas um IP pode vencer a corrida inicial");
  assert.ok([legitimateIp, attackerIp].includes(store.get(raceId).first_viewer_ip));
}

export async function assertRetryAndExpiry(store, dbMock, shareId, legitimateIp, attackerIp) {
  const retry = await getShareForViewD1(dbMock, shareId, legitimateIp);
  assert.ok(retry, "Mesmo visitante dentro da janela de 60s DEVE conseguir recarregar/descriptografar a mídia");
  assert.strictEqual(retry.id, shareId);
  assert.strictEqual(await getShareForViewD1(dbMock, shareId, attackerIp), null);
  const stored = store.get(shareId);
  stored.first_viewed_at = Date.now() - 65 * 1000;
  store.set(shareId, stored);
  assert.strictEqual(await getShareForViewD1(dbMock, shareId, legitimateIp), null);
  assert.strictEqual(store.get(shareId).status, "consumed");
}
