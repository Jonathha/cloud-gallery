import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";

export async function handleListImages(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return jsonResponse({ success: false, error: "userId parameter is required" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  try {
    const verifiedUser = await validateBanco1Token(authHeader);
    if (verifiedUser.uid !== userId) {
      return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar estes arquivos." }, 403);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  return jsonResponse({ success: true, images: [] });
}

export async function handleListProtectedImages(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return jsonResponse({ success: false, error: "userId parameter is required" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  try {
    const verifiedUser = await validateBanco1Token(authHeader);
    if (verifiedUser.uid !== userId) {
      return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar estes arquivos." }, 403);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  return jsonResponse({ success: true, images: [] });
}

