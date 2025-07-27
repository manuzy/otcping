export interface User {
  id: string;
  walletAddress: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
  description?: string;
  isPublic: boolean;
  reputation: number;
  successfulTrades: number;
  totalTrades: number;
  joinedAt: Date;
  contacts: string[]; // user IDs
}

export interface NotificationSettings {
  email?: string;
  telegram?: string;
  slack?: string;
  phone?: string;
  enableEmail: boolean;
  enableTelegram: boolean;
  enableSlack: boolean;
  enableSMS: boolean;
  emailFrequency: 'all' | 'first_only';
}

export interface AlertFilter {
  id: string;
  userId: string;
  name: string;
  chain?: string;
  pair?: string;
  type?: 'buy' | 'sell';
  minSize?: number;
  maxSize?: number;
  isActive: boolean;
  notifications: NotificationSettings;
  createdAt: Date;
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