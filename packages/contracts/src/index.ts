import { z } from 'zod';

// ── 1. Domain Event Header Schema ──────────────────────────────────────────────
export const DomainEventHeaderSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.string().min(1),
  occurredAt: z.string(),
  version: z.number().int().positive().default(1),
  correlationId: z.string().optional(),
});

export type DomainEventHeader = z.infer<typeof DomainEventHeaderSchema>;

// ── 2. User Registered Event Contract (v1) ──────────────────────────────────────
export const UserRegisteredPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  username: z.string().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const UserRegisteredV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('user.registered'),
  version: z.literal(1).default(1),
  payload: UserRegisteredPayloadSchema,
});

export type UserRegisteredEvent = z.infer<typeof UserRegisteredV1Schema>;

// ── 3. Email Verification Requested Event Contract (v1) ──────────────────────────
export const EmailVerificationRequestedPayloadSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email(),
  name: z.string().optional(),
  otp: z.string().min(1),
  expiresInMinutes: z.number().optional(),
});

export const EmailVerificationRequestedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('email.verification.requested'),
  version: z.literal(1).default(1),
  payload: EmailVerificationRequestedPayloadSchema,
});

export type EmailVerificationRequestedEvent = z.infer<typeof EmailVerificationRequestedV1Schema>;

// ── 4. Password Reset Requested Event Contract (v1) ─────────────────────────────
export const PasswordResetRequestedPayloadSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email(),
  otp: z.string().min(1),
  expiresInMinutes: z.number().optional(),
});

export const PasswordResetRequestedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('password.reset.requested'),
  version: z.literal(1).default(1),
  payload: PasswordResetRequestedPayloadSchema,
});

export type PasswordResetRequestedEvent = z.infer<typeof PasswordResetRequestedV1Schema>;

// ── 5. Vibe Created Event Contract (v1) ──────────────────────────────────────────
export const VibeCreatedPayloadSchema = z.object({
  vibeId: z.string().min(1),
  authorId: z.string().min(1),
  content: z.string().optional(),
  mediaUrl: z.string().optional(),
  categoryId: z.string().optional(),
  vibeIdTag: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export const VibeCreatedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('vibe.created'),
  version: z.literal(1).default(1),
  payload: VibeCreatedPayloadSchema,
});

export type VibeCreatedEvent = z.infer<typeof VibeCreatedV1Schema>;

// ── 6. Post Deleted Event Contract (v1) ──────────────────────────────────────────
export const PostDeletedPayloadSchema = z.object({
  postId: z.string().min(1),
  authorId: z.string().min(1),
  deletedAt: z.string(),
});

export const PostDeletedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('post.deleted'),
  version: z.literal(1).default(1),
  payload: PostDeletedPayloadSchema,
});

export type PostDeletedEvent = z.infer<typeof PostDeletedV1Schema>;

// ── 7. Social Followed Event Contract (v1) ───────────────────────────────────────
export const FollowCreatedPayloadSchema = z.object({
  followerId: z.string().min(1),
  followingId: z.string().min(1),
  createdAt: z.string(),
});

export const FollowCreatedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('social.followed'),
  version: z.literal(1).default(1),
  payload: FollowCreatedPayloadSchema,
});

export type FollowCreatedEvent = z.infer<typeof FollowCreatedV1Schema>;

// ── 8. Engagement Liked Event Contract (v1) ──────────────────────────────────────
export const LikeCreatedPayloadSchema = z.object({
  vibeId: z.string().min(1),
  likerId: z.string().min(1),
  authorId: z.string().min(1),
  createdAt: z.string(),
});

export const LikeCreatedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('engagement.liked'),
  version: z.literal(1).default(1),
  payload: LikeCreatedPayloadSchema,
});

export type LikeCreatedEvent = z.infer<typeof LikeCreatedV1Schema>;

// ── 9. Engagement Commented Event Contract (v1) ──────────────────────────────────
export const CommentCreatedPayloadSchema = z.object({
  commentId: z.string().min(1),
  vibeId: z.string().min(1),
  commenterId: z.string().min(1),
  authorId: z.string().min(1),
  content: z.string(),
  createdAt: z.string(),
});

export const CommentCreatedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('engagement.commented'),
  version: z.literal(1).default(1),
  payload: CommentCreatedPayloadSchema,
});

export type CommentCreatedEvent = z.infer<typeof CommentCreatedV1Schema>;

// ── 10. ReGrid Created Event Contract (v1) ────────────────────────────────────────
export const ReGridCreatedPayloadSchema = z.object({
  regridId: z.string().min(1),
  postId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string(),
});

export const ReGridCreatedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('regrid.created'),
  version: z.literal(1).default(1),
  payload: ReGridCreatedPayloadSchema,
});

export type ReGridCreatedEvent = z.infer<typeof ReGridCreatedV1Schema>;

// ── 11. Media Uploaded Event Contract (v1) ────────────────────────────────────────
export const MediaUploadedPayloadSchema = z.object({
  mediaId: z.string().min(1),
  uploaderId: z.string().min(1),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().nonnegative(),
  uploadedAt: z.string(),
});

export const MediaUploadedV1Schema = DomainEventHeaderSchema.extend({
  eventName: z.literal('media.uploaded'),
  version: z.literal(1).default(1),
  payload: MediaUploadedPayloadSchema,
});

export type MediaUploadedEvent = z.infer<typeof MediaUploadedV1Schema>;

// ── Union of All Canonical Domain Event Schemas ───────────────────────────────
export const DomainEventSchema = z.discriminatedUnion('eventName', [
  UserRegisteredV1Schema,
  EmailVerificationRequestedV1Schema,
  PasswordResetRequestedV1Schema,
  VibeCreatedV1Schema,
  PostDeletedV1Schema,
  FollowCreatedV1Schema,
  LikeCreatedV1Schema,
  CommentCreatedV1Schema,
  ReGridCreatedV1Schema,
  MediaUploadedV1Schema,
]);

export type AnyDomainEvent = z.infer<typeof DomainEventSchema>;

// ── Producer Helper ─────────────────────────────────────────────────────────────
export function createEventHeader(eventName: string, correlationId?: string): DomainEventHeader {
  return {
    eventId: crypto.randomUUID(),
    eventName,
    occurredAt: new Date().toISOString(),
    version: 1,
    correlationId,
  };
}

// ── Consumer Validation Guard ───────────────────────────────────────────────────
export function validateEvent(rawEvent: unknown): AnyDomainEvent {
  const parseResult = DomainEventSchema.safeParse(rawEvent);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`[Contract Validation Error] Malformed event payload: ${errorDetails}`);
  }
  return parseResult.data;
}
