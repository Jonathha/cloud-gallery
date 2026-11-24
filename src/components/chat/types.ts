/**
 * Chat Global Data Types & Interfaces
 * Provides strong typing for messages, user profiles, audio payloads, and component props.
 */

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  mediaType: 'text' | 'image' | 'audio' | 'video';
  text?: string;
  textCiphertext?: string;
  textIv?: string;
  createdAt: any;
  decryptedText?: string;
  replyToId?: string;
  replyToUserName?: string;
  replyToText?: string;
  replyToCiphertext?: string;
  replyToIv?: string;
  decryptedReplyTo?: string;
  audioUrl?: string;
  audioDurationMs?: number;
  audioSize?: number;
  sendDurationMs?: number;
  isPending?: boolean;
  hasError?: boolean;
  errorText?: string;
}

export interface ChatProfile {
  uid?: string;
  username: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ChatTabProps {
  onBackToGallery?: () => void;
}

export interface ChatAudioPayload {
  blob: Blob;
  durationMs: number;
}

export interface ChatReplyState {
  replyingTo: ChatMessage | null;
}
