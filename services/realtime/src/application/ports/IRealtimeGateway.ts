export interface NotificationEventDTO {
  id: string;
  type: string;
  userId: string;
  creatorId: string;
  postId?: string;
  commentId?: string;
  isRead: boolean;
  createdAt: string | Date;
}

export interface FeedSignalDTO {
  type: 'new_content' | 'post_deleted' | 'post_updated';
  postId?: string;
  recipientIds?: string[];
}

export interface PresenceEventDTO {
  userId: string;
  status: 'online' | 'offline';
  timestamp: number;
}

export interface DirectMessageEventDTO {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
}

export interface IRealtimeGateway {
  emitNotificationToUser(userId: string, notification: NotificationEventDTO): void;
  emitFeedUpdateToUser(userId: string, feedSignal: FeedSignalDTO): void;
  broadcastFeedUpdate(feedSignal: FeedSignalDTO): void;
  broadcastPresence(presence: PresenceEventDTO): void;
  emitDirectMessageToUser(userId: string, messageSignal: DirectMessageEventDTO): void;
}

