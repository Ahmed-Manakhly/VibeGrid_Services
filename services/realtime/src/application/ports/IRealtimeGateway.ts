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

export interface IRealtimeGateway {
  emitNotificationToUser(userId: string, notification: NotificationEventDTO): void;
  emitFeedUpdateToUser(userId: string, feedSignal: FeedSignalDTO): void;
  broadcastPresence(presence: PresenceEventDTO): void;
}
