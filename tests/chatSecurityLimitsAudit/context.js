export function createContext() {
  const ctx = { passed: 0, total: 0 };

  ctx.test = async function test(name, fn) {
    ctx.total++;
    try {
      await fn();
      console.log(`[PASS] Teste ${ctx.total}: ${name}`);
      ctx.passed++;
    } catch (err) {
      console.error(`[FAIL] Teste ${ctx.total}: ${name}`);
      console.error(err);
    }
  };

  return ctx;
}
