import { sqlHandlers } from "./sqlHandlers.js";

export function executeSql(sql, params = [], tables) {
  const normalized = sql.trim().replace(/\s+/g, " ");

  for (const handler of sqlHandlers) {
    const result = handler(normalized, params, tables);
    if (result !== undefined) return result;
  }

  return { results: [], meta: { changes: 0 } };
}
