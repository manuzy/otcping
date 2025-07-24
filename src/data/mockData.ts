import { User, Chat, Trade, Message } from "@/types";

export const mockUsers: User[] = [
  {
    id: "1",
    walletAddress: "0x1234...5678",
    displayName: "Alice Cooper",
    avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=150&h=150&fit=crop&crop=face",
    isOnline: true,
  },
  {
    id: "2",
    walletAddress: "0x8765...4321",
    displayName: "Bob Smith",
    avatar: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=150&h=150&fit=crop&crop=face",
    isOnline: false,
  },
  {
    id: "3",
    walletAddress: "0xabcd...efgh",
    displayName: "Charlie Brown",
    avatar: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=150&h=150&fit=crop&crop=face",
    isOnline: true,
  },
];

export const mockTrades: Trade[] = [
  {
    id: "1",
    chain: "Ethereum",
    pair: "ETH/USDC",
    size: "5 ETH",
    price: "2500 USDC",
    type: "sell",
    status: "active",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    createdBy: "1",
  },
  {
    id: "2",
    chain: "Ethereum",
    pair: "USDC/ETH",
    size: "10000 USDC",
    price: "2450 USDC",
    type: "buy",
    status: "active",
    createdAt: new Date("2024-01-15T11:30:00Z"),
    createdBy: "2",
  },
];

export const mockMessages: Message[] = [
  {
    id: "1",
    chatId: "1",
    senderId: "1",
    content: "Hey, I'm looking to sell 5 ETH at 2500 USDC each. Anyone interested?",
    type: "message",
    timestamp: new Date("2024-01-15T10:00:00Z"),
  },
  {
    id: "2",
    chatId: "1",
    senderId: "system",
    content: "Trade created: Sell 5 ETH for 2500 USDC each",
    type: "trade_action",
    timestamp: new Date("2024-01-15T10:01:00Z"),
  },
  {
    id: "3",
    chatId: "1",
    senderId: "2",
    content: "I'm interested! Can we discuss the timing?",
    type: "message",
    timestamp: new Date("2024-01-15T10:15:00Z"),
  },
];

export const mockChats: Chat[] = [
  {
    id: "1",
    name: "ETH/USDC Trade",
    isPublic: true,
    trade: mockTrades[0],
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: mockMessages[2],
    unreadCount: 1,
    lastActivity: new Date("2024-01-15T10:15:00Z"),
  },
  {
    id: "2",
    name: "USDC/ETH Trade",
    isPublic: false,
    trade: mockTrades[1],
    participants: [mockUsers[1], mockUsers[2]],
    lastMessage: {
      id: "4",
      chatId: "2",
      senderId: "2",
      content: "Looking to buy ETH with my USDC",
      type: "message",
      timestamp: new Date("2024-01-15T11:30:00Z"),
    },
    unreadCount: 0,
    lastActivity: new Date("2024-01-15T11:30:00Z"),
  },
];

export const currentUser = mockUsers[0];