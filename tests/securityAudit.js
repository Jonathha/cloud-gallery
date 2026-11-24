import { runCaptchaForgeryTest } from "./securityAudit/captchaForgery.js";
import { runExpiredChallengeTest } from "./securityAudit/expiredChallenge.js";
import { runDurableObjectScopeTest } from "./securityAudit/durableObjectScope.js";
import { runE2eeIntegrityTest } from "./securityAudit/e2eeIntegrity.js";
import { runOneTimeShareTest } from "./securityAudit/oneTimeShare.js";
import { runClearanceScopeTest, runClearanceSignatureTest, runMissingSecretTest } from "./securityAudit/clearanceAndSecret.js";

async function runTests() {
  console.log("=== INICIANDO BATERIA DE TESTES DE SEGURANÇA CIRÚRGICA ===\n");
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    return (async () => {
      try {
        await fn();
        console.log(`[PASS] Teste ${total}: ${name}`);
        passed++;
      } catch (err) {
        console.error(`[FAIL] Teste ${total}: ${name}`);
        console.error(err);
      }
    })();
  }

  await runCaptchaForgeryTest(test);
  await runExpiredChallengeTest(test);
  await runClearanceScopeTest(test);
  await runDurableObjectScopeTest(test);
  await runClearanceSignatureTest(test);
  await runMissingSecretTest(test);
  await runE2eeIntegrityTest(test);
  await runOneTimeShareTest(test);

  console.log(`\n=== RESULTADO: ${passed}/${total} TESTES PASSARAM COM SUCESSO ===`);
  if (passed !== total) process.exit(1);
}

runTests().catch(err => {
  console.error("Erro fatal durante a execução dos testes:", err);
  process.exit(1);
});
