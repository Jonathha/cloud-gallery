import { jsonResponse } from "./workerHelpers.js";
import { extractBearerToken, verifyFirebaseIdToken, isUserAdmin } from "./workerLogs/auth.js";
import { getUserRouletteStatus, processRouletteSpin } from "./workerRoulette/rouletteService.js";
import { getAdminRouletteUsers, getAdminRouletteSpins, getAdminRouletteSpinById, updateAdminUserSpins } from "./workerRoulette/adminService.js";

async function authenticateRequest(request, body) {
  const token = extractBearerToken(request, body);
  if (!token) return null;
  return await verifyFirebaseIdToken(token);
}

export async function handleRouletteStatus(request, env) {
  const user = await authenticateRequest(request);
  if (!user || !user.uid) {
    return jsonResponse({ success: false, error: "Autenticação obrigatória para acessar a roleta." }, 401);
  }
  try {
    const status = await getUserRouletteStatus(env, user.uid, user.email);
    return jsonResponse({ success: true, ...status });
  } catch (err) {
    console.error("[RouletteStatus] Error:", err);
    return jsonResponse({ success: false, error: "Erro ao consultar status da roleta." }, 500);
  }
}

export async function handleRouletteSpin(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const user = await authenticateRequest(request, body);
  if (!user || !user.uid) {
    return jsonResponse({ success: false, error: "Autenticação obrigatória para girar a roleta." }, 401);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const requestId = body.requestId || body.clientRequestId || null;
  try {
    const result = await processRouletteSpin(env, user.uid, user.email, ip, requestId);
    if (!result.success) {
      return jsonResponse(result, 400);
    }
    return jsonResponse(result);
  } catch (err) {
    console.error("[RouletteSpin] Error:", err);
    return jsonResponse({ success: false, error: "Erro ao processar o giro." }, 500);
  }
}

export async function handleAdminRouletteUsers(request, env) {
  const user = await authenticateRequest(request);
  if (!user || !isUserAdmin(user.email, env)) {
    return jsonResponse({ success: false, error: "Acesso administrativo negado." }, 403);
  }
  try {
    const users = await getAdminRouletteUsers(env);
    return jsonResponse({ success: true, users });
  } catch (err) {
    console.error("[AdminRouletteUsers] Error:", err);
    return jsonResponse({ success: false, error: "Erro ao buscar usuários da roleta." }, 500);
  }
}

export async function handleAdminRouletteSpins(request, env) {
  const user = await authenticateRequest(request);
  if (!user || !isUserAdmin(user.email, env)) {
    return jsonResponse({ success: false, error: "Acesso administrativo negado." }, 403);
  }
  try {
    const spins = await getAdminRouletteSpins(env);
    return jsonResponse({ success: true, spins });
  } catch (err) {
    console.error("[AdminRouletteSpins] Error:", err);
    return jsonResponse({ success: false, error: "Erro ao buscar partidas da roleta." }, 500);
  }
}

export async function handleAdminRouletteSpinDetail(request, env, spinId) {
  const user = await authenticateRequest(request);
  if (!user || !isUserAdmin(user.email, env)) {
    return jsonResponse({ success: false, error: "Acesso administrativo negado." }, 403);
  }
  try {
    const spin = await getAdminRouletteSpinById(env, spinId);
    if (!spin) {
      return jsonResponse({ success: false, error: "Partida não encontrada." }, 404);
    }
    return jsonResponse({ success: true, spin });
  } catch (err) {
    console.error("[AdminRouletteSpinDetail] Error:", err);
    return jsonResponse({ success: false, error: "Erro ao buscar detalhes da partida." }, 500);
  }
}

export async function handleAdminUpdateUserSpins(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const user = await authenticateRequest(request, body);
  if (!user || !isUserAdmin(user.email, env)) {
    return jsonResponse({ success: false, error: "Acesso administrativo negado." }, 403);
  }
  const { userId, delta } = body;
  if (!userId || typeof delta !== "number") {
    return jsonResponse({ success: false, error: "Parâmetros inválidos." }, 400);
  }
  try {
    const updatedUser = await updateAdminUserSpins(env, userId, delta);
    return jsonResponse({ success: true, user: updatedUser });
  } catch (err) {
    console.error("[AdminUpdateUserSpins] Error:", err);
    return jsonResponse({ success: false, error: "Erro ao atualizar giros do usuário." }, 500);
  }
}

