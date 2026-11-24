import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChatAuth } from './chat/useChatAuth';
import { useChatMessages } from './chat/useChatMessages';
import ChatHeader from './chat/ChatHeader';
import ChatMessageList from './chat/ChatMessageList';
import ChatMessageInput from './chat/ChatMessageInput';
import ChatProfileForm from './chat/ChatProfileForm';
import { ChatMessage } from './chat/types';

interface ChatTabProps { onBackToGallery?: () => void; }

export default function ChatTab({ onBackToGallery }: ChatTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'jogonesteterp@gmail.com';
  const { chatKey, profile, loading, registering, registerProfile } = useChatAuth(user);
  const { messages, loadingMessages, sendMessage, sendAudio, deleteMessage, deleteMessages, dismissFailedMessage, hasMoreOlder, loadingOlder, loadOlder } = useChatMessages(chatKey, profile);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [inputWrap, setInputWrap] = useState<HTMLDivElement | null>(null);

  // Altura real do campo de mensagem (cresce com várias linhas, banner de resposta e avisos);
  // a lista e os botões flutuantes usam essa medida para nunca ficarem por baixo dele.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!inputWrap || !container) return;
    const apply = () => container.style.setProperty('--chat-input-h', `${Math.ceil(inputWrap.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(inputWrap);
    return () => { ro.disconnect(); container.style.removeProperty('--chat-input-h'); };
  }, [inputWrap]);

  React.useEffect(() => {
    if (replyingTo && !messages.some(m => m.id === replyingTo.id && !m.hasError)) {
      setReplyingTo(null);
    }
  }, [messages, replyingTo]);

  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const originalHtml = { overflow: html.style.overflow, height: html.style.height, overscrollBehavior: html.style.overscrollBehavior };
    const originalBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      bottom: body.style.bottom,
      height: body.style.height,
      minHeight: body.style.minHeight,
      width: body.style.width,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.overscrollBehavior = 'none';

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = '0';
    body.style.left = '0';
    body.style.right = '0';
    body.style.bottom = '0';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.minHeight = '0';
    body.style.overscrollBehavior = 'none';

    const update = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (html.scrollTop !== 0) html.scrollTop = 0;
      if (body.scrollTop !== 0) body.scrollTop = 0;

      const el = containerRef.current;
      if (!el) return;

      if (window.innerWidth >= 1024) {
        el.style.height = '100%';
        el.style.maxHeight = '100%';
      } else {
        const vv = window.visualViewport;
        const h = vv ? Math.round(vv.height) : window.innerHeight;
        el.style.height = `${h}px`;
        el.style.maxHeight = `${h}px`;
      }
    };

    const handleScrollReset = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (html.scrollTop !== 0) html.scrollTop = 0;
      if (body.scrollTop !== 0) body.scrollTop = 0;
    };

    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', handleScrollReset);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', handleScrollReset);
    update();

    return () => {
      html.style.overflow = originalHtml.overflow;
      html.style.height = originalHtml.height;
      html.style.overscrollBehavior = originalHtml.overscrollBehavior;

      body.style.overflow = originalBody.overflow;
      body.style.position = originalBody.position;
      body.style.top = originalBody.top;
      body.style.left = originalBody.left;
      body.style.right = originalBody.right;
      body.style.bottom = originalBody.bottom;
      body.style.height = originalBody.height;
      body.style.minHeight = originalBody.minHeight;
      body.style.width = originalBody.width;
      body.style.overscrollBehavior = originalBody.overscrollBehavior;

      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', handleScrollReset);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', handleScrollReset);
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-x-0 top-0 lg:relative lg:top-auto lg:left-auto lg:right-auto lg:h-full lg:flex-1 bg-[#050505] z-50 flex flex-col overflow-hidden overscroll-none" id="chat-tab-container" style={{height:'100dvh',maxHeight:'100dvh'}}>
    <ChatHeader onBackToGallery={onBackToGallery} />
    <div className="flex-1 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {loading ? <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></motion.div> :
        !profile ? <motion.div key="profile" initial={{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.98}} className="absolute inset-0"><ChatProfileForm onRegister={registerProfile} registering={registering} /></motion.div> :
        <motion.div key="room" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 min-h-0 overflow-hidden">
          <div className="absolute inset-0">
            <ChatMessageList
              messages={messages}
              loadingMessages={loadingMessages}
              hasMoreOlder={hasMoreOlder}
              loadingOlder={loadingOlder}
              onLoadOlder={loadOlder}
              currentUserId={user?.uid}
              isAdmin={isAdmin}
              onReplyMessage={(msg) => {
                if (msg && !msg.hasError && !msg.isPending && messages.some(m => m.id === msg.id && !m.hasError)) {
                  setReplyingTo(msg);
                }
              }}
              onDeleteMessage={deleteMessage}
              onDeleteMessages={deleteMessages}
              onRetryFailedMessage={async (failedMsg) => {
                const targetReply = failedMsg.replyToId ? {
                  id: failedMsg.replyToId,
                  userId: '',
                  userName: failedMsg.replyToUserName || '',
                  mediaType: 'text' as const,
                  decryptedText: failedMsg.decryptedReplyTo || failedMsg.replyToText || '',
                  text: failedMsg.replyToText,
                  createdAt: 0
                } : undefined;
                if (failedMsg.mediaType === 'text') {
                  const text = failedMsg.decryptedText || failedMsg.text || '';
                  dismissFailedMessage(failedMsg.id);
                  await sendMessage(text, targetReply);
                } else if (failedMsg.mediaType === 'audio' && failedMsg.audioUrl) {
                  // O audioUrl da mensagem com erro ainda é o blob: local (nunca revogado),
                  // então dá para reenviar o mesmo áudio. Reusa o id: o servidor faz upsert, sem duplicar.
                  try {
                    const blob = await (await fetch(failedMsg.audioUrl)).blob();
                    dismissFailedMessage(failedMsg.id);
                    await sendAudio(blob, failedMsg.audioDurationMs || 0, targetReply, failedMsg.id);
                  } catch (err) {
                    console.error('[ChatTab] Falha ao reenviar áudio:', err);
                  }
                }
              }}
              onDismissFailedMessage={dismissFailedMessage}
            />
          </div>
          <div ref={setInputWrap} className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <ChatMessageInput
              onSendMessage={async text => {
                const target = (replyingTo && messages.some(m => m.id === replyingTo.id && !m.hasError)) ? replyingTo : undefined;
                setReplyingTo(null);
                await sendMessage(text, target);
              }}
              onSendAudio={async (blob, duration) => {
                const target = (replyingTo && messages.some(m => m.id === replyingTo.id && !m.hasError)) ? replyingTo : undefined;
                setReplyingTo(null);
                await sendAudio(blob, duration, target);
              }}
              disabled={!profile}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>
  </div>;
}
