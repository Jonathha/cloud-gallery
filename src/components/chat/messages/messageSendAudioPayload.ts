import { ChatMessage, ChatProfile } from '../types';
import { getReplyPreviewText } from '../chatReplyPreview';

/**
 * Builds optimistic audio message model and reply reference
 */
export function buildOptimisticAudioMessage(
  msgId: string,
  userId: string,
  profile: ChatProfile,
  localAudioUrl: string,
  durationMs: number,
  size: number,
  validReply: ChatMessage | undefined,
  now: number
): { optimisticMsg: ChatMessage; replyPlainText: string | undefined } {
  const replyPlainText = validReply ? getReplyPreviewText(validReply) : undefined;
  const optimisticMsg: ChatMessage = {
    id: msgId,
    userId,
    userName: profile.username,
    mediaType: 'audio',
    audioUrl: localAudioUrl,
    audioDurationMs: durationMs,
    audioSize: size,
    replyToId: validReply?.id,
    replyToUserName: validReply?.userName,
    replyToText: replyPlainText,
    decryptedReplyTo: replyPlainText,
    createdAt: now,
    isPending: true
  };

  return { optimisticMsg, replyPlainText };
}
