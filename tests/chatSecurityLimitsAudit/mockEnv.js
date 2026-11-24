import { installMockFetch } from "./mockFetch.js";

export function createMockEnv() {
  const d1Tables = {
    chat_global_json_chunks: new Map(),
    chat_global_locks: new Map(),
    chat_global_audio_uploads: new Map(),
    chat_global_media_cleanup: new Map()
  };

  const r2Bucket = new Map();

  const mockEnv = {
    CHAT_GLOBAL_D1_API_TOKEN: "mock_token",
    CHAT_R2: {
      async head(key) {
        return r2Bucket.get(key) || null;
      },
      async put(key, value, options) {
        r2Bucket.set(key, { value, customMetadata: options?.customMetadata, httpMetadata: options?.httpMetadata });
      },
      async delete(key) {
        if (mockEnv.__failNextDelete) {
          mockEnv.__failNextDelete = false;
          throw new Error("Simulated R2 network timeout");
        }
        r2Bucket.delete(key);
      }
    },
    __failNextDelete: false,
    __failQueryMatch: null,
    __d1Tables: d1Tables,
    __r2Bucket: r2Bucket
  };

  installMockFetch(mockEnv, d1Tables);

  return mockEnv;
}
