import { useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import ChatContextMenuPanel from './ChatContextMenuPanel';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatContextMenu({ c }: { c: ChatMessageListController }) {
  const { menu, closeMenu } = c.menu;
  const currentUserId = c.props.currentUserId;
  const setSelectedMessage = c.modals.setSelectedMessage;

  const handleDetails = useCallback((msg: NonNullable<typeof menu>['message']) => {
    closeMenu();
    setSelectedMessage(msg);
  }, [closeMenu, setSelectedMessage]);

  return (
    <AnimatePresence>
      {menu && (
        <ChatContextMenuPanel
          key={menu.message.id}
          message={menu.message}
          anchor={menu.anchor}
          alignRight={menu.message.userId === currentUserId}
          onClose={closeMenu}
          onDetails={handleDetails}
        />
      )}
    </AnimatePresence>
  );
}
