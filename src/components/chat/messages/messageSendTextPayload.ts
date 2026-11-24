import { ChatMessage, ChatProfile } from '../types';
import { getReplyPreviewText } from '../chatReplyPreview';

/**
 * Builds optimistic text message model and API post payload
 */
export function buildOptimisticTextMessage(
  msgId: string,
  userId: string,
  profile: ChatProfile,
  cleanText: string,
  validReply: ChatMessage | undefined,
  now: number
): { optimisticMsg: ChatMessage; body: any; replyPlainText: string | undefined } {
  const replyPlainText = validReply ? getReplyPreviewText(validReply) : undefined;
  const optimisticMsg: ChatMessage = {
    id: msgId,
    userId,
    userName: profile.username,
    mediaType: 'text',
    text: cleanText,
    decryptedText: cleanText,
    replyToId: validReply?.id,
    replyToUserName: validReply?.userName,
    replyToText: replyPlainText,
    decryptedReplyTo: replyPlainText,
    createdAt: now,
    isPending: true
  };

  const body: any = { id: msgId, mediaType: 'text', text: cleanText, createdAt: now };
  if (validReply?.id) {
    body.replyToId = validReply.id;
    body.replyToUserName = validReply.userName;
    body.replyToText = replyPlainText;
    if (validReply.replyToCiphertext) body.replyToCiphertext = validReply.replyToCiphertext;
    if (validReply.replyToIv) body.replyToIv = validReply.replyToIv;
  }

  return { optimisticMsg, body, replyPlainText };
}
