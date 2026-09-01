import { executeD1Query, executeD1Run } from "./d1Client.js";
import { pickWeightedReward, generateDeterministicStrip } from "./rewards.js";

export async function getUserRouletteStatus(env, userId, email) {
  const now = Date.now();
  const selectRes = await executeD1Query(
    env,
    "SELECT user_id, email, spins_remaining, total_spins, last_activity, created_at FROM roulette_users WHERE user_id = ?",
    [userId]
  );

  if (selectRes.results && selectRes.results.length > 0) {
    const row = selectRes.results[0];
    return {
      userId: row.user_id,
      email: row.email,
      spinsRemaining: Number(row.spins_remaining),
      totalSpins: Number(row.total_spins),
      lastActivity: Number(row.last_activity)
    };
  }

  // Cria usuário novo com 3 giros padrão
  await executeD1Run(
    env,
    "INSERT OR IGNORE INTO roulette_users (user_id, email, spins_remaining, total_spins, last_activity, created_at) VALUES (?, ?, 3, 0, ?, ?)",
    [userId, email || null, now, now]
  );

  return {
    userId,
    email: email || null,
    spinsRemaining: 3,
    totalSpins: 0,
    lastActivity: now
  };
}

export async function processRouletteSpin(env, userId, email, ip, clientRequestId = null) {
  const now = Date.now();

  // Idempotência: protege contra double-click e retry de rede
  if (clientRequestId && typeof clientRequestId === "string" && clientRequestId.length > 5) {
    const existing = await executeD1Query(
      env,
      "SELECT id, reward_id, reward_amount, reward_label, reward_tier, strip_item_ids, jitter, spins_remaining FROM roulette_spins WHERE id = ? AND user_id = ?",
      [clientRequestId, userId]
    );
    if (existing.results && existing.results.length > 0) {
      const row = existing.results[0];
      let stripItemIds = [];
      try { stripItemIds = JSON.parse(row.strip_item_ids); } catch { stripItemIds = []; }
      return {
        success: true,
        spinId: row.id,
        reward: { id: row.reward_id, amount: row.reward_amount, label: row.reward_label, tier: row.reward_tier },
        stripItemIds,
        jitter: row.jitter,
        spinsRemaining: row.spins_remaining,
        idempotent: true
      };
    }
  }

  let newSpinsRemaining = null;

  // Garante existência da conta e realiza a dedução atômica com RETURNING
  if (env && env.DB && typeof env.DB.batch === "function") {
    try {
      const sqlInsert = "INSERT OR IGNORE INTO roulette_users (user_id, email, spins_remaining, total_spins, last_activity, created_at) VALUES (?, ?, 3, 0, ?, ?)";
      const sqlUpdate = "UPDATE roulette_users SET spins_remaining = spins_remaining - 1, total_spins = total_spins + 1, last_activity = ?, email = COALESCE(?, email) WHERE user_id = ? AND spins_remaining > 0 RETURNING spins_remaining";
      
      const batchResults = await env.DB.batch([
        env.DB.prepare(sqlInsert).bind(userId, email || null, now, now),
        env.DB.prepare(sqlUpdate).bind(now, email || null, userId)
      ]);

      const updateRes = batchResults[1];
      if (updateRes && updateRes.results && updateRes.results.length > 0) {
        newSpinsRemaining = Number(updateRes.results[0].spins_remaining);
      }
    } catch (batchErr) {
      console.warn("[RouletteService] Batch error, falling back to individual queries:", batchErr);
    }
  }

  // Fallback caso batch não esteja disponível ou falhe
  if (newSpinsRemaining === null) {
    await executeD1Run(
      env,
      "INSERT OR IGNORE INTO roulette_users (user_id, email, spins_remaining, total_spins, last_activity, created_at) VALUES (?, ?, 3, 0, ?, ?)",
      [userId, email || null, now, now]
    );

    const updateRes = await executeD1Query(
      env,
      "UPDATE roulette_users SET spins_remaining = spins_remaining - 1, total_spins = total_spins + 1, last_activity = ?, email = COALESCE(?, email) WHERE user_id = ? AND spins_remaining > 0 RETURNING spins_remaining",
      [now, email || null, userId]
    );

    if (updateRes.results && updateRes.results.length > 0) {
      newSpinsRemaining = Number(updateRes.results[0].spins_remaining);
    }
  }

  if (newSpinsRemaining === null) {
    const status = await getUserRouletteStatus(env, userId, email);
    return {
      success: false,
      error: "Você não possui mais giros disponíveis.",
      spinsRemaining: status.spinsRemaining
    };
  }

  // Sorteio autoritativo no servidor
  const reward = pickWeightedReward();
  const stripItemIds = generateDeterministicStrip(reward.id);
  const jitter = (Math.random() - 0.5) * 26;

  const spinId = clientRequestId && clientRequestId.length > 5
    ? clientRequestId
    : `spin_${now}_${Math.random().toString(36).substring(2, 8)}`;

  // Registro persistente da partida no D1 para auditoria e replay determinístico
  await executeD1Run(
    env,
    "INSERT INTO roulette_spins (id, user_id, user_email, reward_id, reward_amount, reward_label, reward_tier, strip_item_ids, jitter, spins_remaining, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      spinId,
      userId,
      email || null,
      reward.id,
      reward.amount,
      reward.label,
      reward.tier,
      JSON.stringify(stripItemIds),
      jitter,
      newSpinsRemaining,
      ip || null,
      now
    ]
  );

  return {
    success: true,
    spinId,
    reward,
    stripItemIds,
    jitter,
    spinsRemaining: newSpinsRemaining
  };
}
