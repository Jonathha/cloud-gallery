import { fetchAndUnpackImage } from "../../../../utils/fileCrypto";

export async function downloadWithRetry(itemId: string, token: string) {
  let fileData = null;
  let attempts = 3;
  let delayMs = 1000;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      fileData = await fetchAndUnpackImage(itemId, token);
      break;
    } catch (e: any) {
      if (e.message && e.message.includes('404') && attempt < attempts) {
        await new Promise(res => setTimeout(res, delayMs));
        delayMs *= 2;
        continue;
      }
      throw e;
    }
  }
  if (!fileData || !fileData.ciphertext || fileData.ciphertext === "chunked_vault_data") {
    throw new Error("Mídia vazia ou inválida");
  }
  return fileData;
}
