/**
 * Domain Event Payload Contracts for VibeGrid Distributed System
 * Shared contract between VibeGrid (Next.js BFF) and VibeGrid_Services (Backend Workers/Microservices)
 */

export interface DomainEventHeader {
  eventId: string;
  eventName: string;
  occurredAt: string; // ISO 8601 timestamp
  version: string;
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UserRegisteredEvent extends DomainEventHeader {
  eventName: "user.registered";
  payload: UserRegisteredPayload;
}

export interface VibeCreatedPayload {
  vibeId: string;
  authorId: string;
  content?: string;
  mediaUrl?: string;
  categoryId?: string;
  vibeIdTag?: string;
  tags?: string[];
  createdAt: string;
}

export interface VibeCreatedEvent extends DomainEventHeader {
  eventName: "vibe.created";
  payload: VibeCreatedPayload;
}

export interface FollowCreatedPayload {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface FollowCreatedEvent extends DomainEventHeader {
  eventName: "social.followed";
  payload: FollowCreatedPayload;
}

export interface LikeCreatedPayload {
  vibeId: string;
  likerId: string;
  authorId: string;
  createdAt: string;
}

export interface LikeCreatedEvent extends DomainEventHeader {
  eventName: "engagement.liked";
  payload: LikeCreatedPayload;
}

export interface CommentCreatedPayload {
  commentId: string;
  vibeId: string;
  commenterId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface CommentCreatedEvent extends DomainEventHeader {
  eventName: "engagement.commented";
  payload: CommentCreatedPayload;
}

export interface MediaUploadedPayload {
  mediaId: string;
  uploaderId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface MediaUploadedEvent extends DomainEventHeader {
  eventName: "media.uploaded";
  payload: MediaUploadedPayload;
}

export type AnyDomainEvent =
  | UserRegisteredEvent
  | VibeCreatedEvent
  | FollowCreatedEvent
  | LikeCreatedEvent
  | CommentCreatedEvent
  | MediaUploadedEvent;
