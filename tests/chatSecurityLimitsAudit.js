import { createContext } from "./chatSecurityLimitsAudit/context.js";
import { part01 } from "./chatSecurityLimitsAudit/parts/part01.js";
import { part02 } from "./chatSecurityLimitsAudit/parts/part02.js";
import { part03 } from "./chatSecurityLimitsAudit/parts/part03.js";
import { part04 } from "./chatSecurityLimitsAudit/parts/part04.js";
import { part05 } from "./chatSecurityLimitsAudit/parts/part05.js";
import { part06 } from "./chatSecurityLimitsAudit/parts/part06.js";
import { part07 } from "./chatSecurityLimitsAudit/parts/part07.js";
import { part08 } from "./chatSecurityLimitsAudit/parts/part08.js";
import { part09 } from "./chatSecurityLimitsAudit/parts/part09.js";
import { part10 } from "./chatSecurityLimitsAudit/parts/part10.js";
import { part11 } from "./chatSecurityLimitsAudit/parts/part11.js";
import { part12 } from "./chatSecurityLimitsAudit/parts/part12.js";
import { part13 } from "./chatSecurityLimitsAudit/parts/part13.js";
import { part14 } from "./chatSecurityLimitsAudit/parts/part14.js";

async function runTestSuite() {
  console.log("=== BATERIA DE TESTES: LIMITES DE ENVIO E LIMPEZA DE ÁUDIO NO CHAT GLOBAL ===\n");
  const ctx = createContext();

  await part01(ctx);
  await part02(ctx);
  await part03(ctx);
  await part04(ctx);
  await part05(ctx);
  await part06(ctx);
  await part07(ctx);
  await part08(ctx);
  await part09(ctx);
  await part10(ctx);
  await part11(ctx);
  await part12(ctx);
  await part13(ctx);
  await part14(ctx);

  console.log(`\n=== RESULTADO: ${ctx.passed}/${ctx.total} TESTES PASSARAM COM SUCESSO ===`);
  if (ctx.passed !== ctx.total) process.exit(1);
}

runTestSuite().catch(err => {
  console.error("Erro fatal durante os testes:", err);
  process.exit(1);
});
