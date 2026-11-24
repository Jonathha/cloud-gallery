import { executeSql } from "./sql/executeSql.js";

export function installMockFetch(mockEnv, d1Tables) {
  // Mock global fetch for D1 API
  globalThis.fetch = async (url, options) => {
    const urlStr = String(url);
    if (!urlStr.includes("/d1/database/")) {
      throw new Error(`Unexpected fetch to ${urlStr}`);
    }

    if (mockEnv.__failQueryMatch && options.body && options.body.includes(mockEnv.__failQueryMatch)) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ success: false, errors: [{ message: "Simulated D1 database failure" }] })
      };
    }

    const payload = JSON.parse(options.body);

    if (payload.batch) {
      const batchResults = payload.batch.map(stmt => executeSql(stmt.sql, stmt.params, d1Tables));
      return {
        ok: true,
        json: async () => ({ success: true, result: batchResults })
      };
    }

    const res = executeSql(payload.sql, payload.params, d1Tables);
    return {
      ok: true,
      json: async () => ({ success: true, result: [res] })
    };
  };
}
