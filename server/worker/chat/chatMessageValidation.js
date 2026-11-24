import { decryptChatText } from "./chatCrypto.js";

export async function validateMessagePayload(body, request, user) {
  const id = (typeof body.id === "string" && body.id.trim().length >= 8 && body.id.trim().length <= 64)
    ? body.id.trim()
    : crypto.randomUUID();
  const mediaType = body.mediaType === "audio" ? "audio" : "text";

  const rawText = typeof body.text === "string" ? body.text.trim() : undefined;

  const message = {
    id,
    userId: user.uid,
    userName: "",
    mediaType,
    text: rawText,
    textCiphertext: typeof body.textCiphertext === "string" ? body.textCiphertext : undefined,
    textIv: typeof body.textIv === "string" ? body.textIv : undefined,
    replyToId: typeof body.replyToId === "string" && body.replyToId.trim().length > 0 ? body.replyToId.trim() : undefined,
    replyToUserName: typeof body.replyToUserName === "string" && body.replyToUserName.trim().length > 0 ? body.replyToUserName.trim() : undefined,
    replyToText: typeof body.replyToText === "string" ? body.replyToText : undefined,
    replyToCiphertext: typeof body.replyToCiphertext === "string" ? body.replyToCiphertext : undefined,
    replyToIv: typeof body.replyToIv === "string" ? body.replyToIv : undefined,
    audioUrl: typeof body.audioUrl === "string" ? body.audioUrl : undefined,
    audioDurationMs: Number.isFinite(Number(body.audioDurationMs)) ? Number(body.audioDurationMs) : undefined,
    audioSize: Number.isFinite(Number(body.audioSize)) ? Number(body.audioSize) : undefined,
    createdAt: Date.now()
  };

  if (mediaType === "text") {
    if (message.text) {
      if ([...message.text].length > 3000) {
        throw new Error("A mensagem excede o limite máximo de 3.000 caracteres.");
      }
    } else if (message.textCiphertext && message.textIv) {
      // Legacy support for older encrypted clients
      if (message.textCiphertext.length > 25000) {
        throw new Error("A mensagem excede o limite máximo de 3.000 caracteres.");
      }
      const plainText = await decryptChatText(message.textCiphertext, message.textIv);
      if ([...plainText].length > 3000) {
        throw new Error("A mensagem excede o limite máximo de 3.000 caracteres.");
      }
    } else {
      throw new Error("Conteúdo da mensagem inválido.");
    }
  }

  return message;
}
