import assert from "node:assert";
import { reserveAudioUploadSlot } from "../../../server/chatGlobalD1.js";
import { createMockEnv } from "../mockEnv.js";

export async function part05(ctx) {
  const { test } = ctx;
  // Teste 6: Requisições paralelas não ultrapassam limites
  await test("6. Requisições concorrentes são serializadas e não ultrapassam a cota", async () => {
    const env4 = createMockEnv();
    const user4 = "user_parallel_test";

    // Tenta fazer 10 reservas simultâneas quando o limite é 5
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => reserveAudioUploadSlot(user4, env4))
    );

    const succeeded = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    assert.strictEqual(succeeded.length, 5, "Exatamente 5 reservas paralelas devem ser aceitas");
    assert.strictEqual(rejected.length, 5, "Exatamente 5 reservas paralelas devem ser rejeitadas");
  });
}
