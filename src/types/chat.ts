// Enhanced chat types with Bloomberg-inspired features
export interface EnhancedMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'message' | 'trade_action' | 'system';
  timestamp: Date;
  parentMessageId?: string;
  threadRootId?: string;
  mentions?: string[]; // User IDs mentioned in the message
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  fileName: string;
}

export interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatFolderAssignment {
  id: string;
  chatId: string;
  folderId: string;
  userId: string;
  createdAt: Date;
}

export interface MessageThread {
  rootMessage: EnhancedMessage;
  replies: EnhancedMessage[];
  totalReplies: number;
  lastReplyAt?: Date;
}

export interface ChatSearchResult {
  messageId: string;
  chatId: string;
  content: string;
  timestamp: Date;
  senderName: string;
  chatName: string;
  context: string; // Surrounding text for context
}

export interface BlastMessage {
  id: string;
  senderId: string;
  content: string;
  recipients: string[]; // Chat or user IDs
  sentAt: Date;
  responses: BlastResponse[];
}

export interface BlastResponse {
  id: string;
  blastMessageId: string;
  responderId: string;
  response: string;
  respondedAt: Date;
}