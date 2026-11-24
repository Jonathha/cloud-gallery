import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ChatProfile } from './types';
import { saveCache } from './messages/messagesCache';
import { sendTextMessage } from './messages/messageSendText';
import { sendAudioMessage } from './messages/messageSendAudio';
import { deleteChatMessageApi, deleteChatMessagesBatchApi, dismissFailedChatMessage } from './messages/messageDelete';
import { useChatPolling } from './messages/useChatPolling';

export function useChatMessages(chatKey: CryptoKey | null, profile: ChatProfile | null) {
  const { messages, setMessages, loadingMessages, loadMessages, hasMoreOlder, loadingOlder, loadOlder } = useChatPolling(chatKey, profile);
  const [sending, setSending] = useState(false);
  const activeSendsRef = useRef(0);

  const runWithSending = async (action: () => Promise<void>) => {
    activeSendsRef.current += 1;
    setSending(true);
    try {
      await action();
    } finally {
      activeSendsRef.current = Math.max(0, activeSendsRef.current - 1);
      if (activeSendsRef.current === 0) setSending(false);
    }
  };

  const dismissFailedMessage = useCallback((messageId: string) => {
    dismissFailedChatMessage(messageId, setMessages, saveCache);
  }, [setMessages]);

  const sendMessage = async (text: string, replyTo?: ChatMessage) => {
    if (!profile) return;
    await runWithSending(() => sendTextMessage(text, replyTo, profile, messages, setMessages, saveCache));
  };

  const sendAudio = async (blob: Blob, durationMs: number, replyTo?: ChatMessage, retryMsgId?: string) => {
    if (!profile) return;
    await runWithSending(() => sendAudioMessage(blob, durationMs, replyTo, profile, messages, setMessages, saveCache, retryMsgId));
  };

  const deleteMessage = async (messageId: string) => {
    return deleteChatMessageApi(messageId, setMessages, saveCache);
  };

  const deleteMessages = async (messageIds: string[]) => {
    return deleteChatMessagesBatchApi(messageIds, setMessages, saveCache);
  };

  return { messages, loadingMessages, sending, sendMessage, sendAudio, deleteMessage, deleteMessages, dismissFailedMessage, reloadMessages: loadMessages, hasMoreOlder, loadingOlder, loadOlder };
}
