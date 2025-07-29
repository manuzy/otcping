import { useChats } from "./useChats";

export const useTotalUnreadCount = () => {
  const { chats, loading } = useChats();

  const totalUnreadCount = chats.reduce((total, chat) => {
    return total + (chat.unreadCount || 0);
  }, 0);

  return {
    totalUnreadCount,
    loading
  };
};