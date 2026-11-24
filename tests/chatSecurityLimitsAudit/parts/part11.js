import assert from "node:assert";
import { reserveAudioUploadSlot } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part11(ctx) {
  const { test } = ctx;
  // Teste 15: Falha D1 durante verificação de uploads ativos rejeita a operação com erro controlado e não concede cota
  await test("15. Falha no D1 durante verificação de uploads ativos rejeita a operação e não concede cota indevida", async () => {
    const env13 = createMockEnv();
    const user13 = "user_d1_failure_check";

    // Simula falha na consulta de uploads ativos
    env13.__failQueryMatch = "chat_global_audio_uploads WHERE user_id = ? AND created_at >= ? AND status IN ('reserved', 'uploaded')";

    let threwControlledError = false;
    try {
      await reserveAudioUploadSlot(user13, env13);
    } catch (err) {
      threwControlledError = err.d1Error === true && err.message.includes("Não foi possível verificar os limites de envio");
    }

    assert.strictEqual(threwControlledError, true, "Falha de D1 na consulta de uploads ativos deve lançar erro controlado");
    assert.strictEqual(env13.__d1Tables.chat_global_audio_uploads.size, 0, "Nenhuma reserva ou cota deve ser concedida em caso de falha de consulta");
  });
}
