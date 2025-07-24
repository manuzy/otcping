export interface User {
  id: string;
  walletAddress: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
}

export interface Trade {
  id: string;
  chain: string;
  pair: string;
  size: string;
  price: string;
  type: 'buy' | 'sell';
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  createdBy: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'message' | 'trade_action' | 'system';
  timestamp: Date;
}

export interface Chat {
  id: string;
  name: string;
  isPublic: boolean;
  trade?: Trade;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: Date;
}