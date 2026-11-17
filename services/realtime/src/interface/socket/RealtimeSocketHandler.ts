import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import {
  IRealtimeGateway,
  NotificationEventDTO,
  FeedSignalDTO,
  PresenceEventDTO,
} from '../../application/ports/IRealtimeGateway';
import { IPresenceTracker } from '../../application/ports/IPresenceTracker';
import { SocketJwtAuthenticator } from '../../infrastructure/auth/SocketJwtAuthenticator';
import { PinoRealtimeLogger } from '../../infrastructure/logging/PinoRealtimeLogger';

export interface RealtimeSocketHandlerConfig {
  authenticator: SocketJwtAuthenticator;
  presenceTracker: IPresenceTracker;
  pubSubPublisher?: (channel: string, payload: any) => Promise<number>;
  logger?: PinoRealtimeLogger;
  allowedOrigins?: string[];
}

export class RealtimeSocketHandler implements IRealtimeGateway {
  private io: Server;
  private presenceTracker: IPresenceTracker;
  private authenticator: SocketJwtAuthenticator;
  private pubSubPublisher?: (channel: string, payload: any) => Promise<number>;
  private logger: PinoRealtimeLogger;

  constructor(httpServer: HttpServer, config: RealtimeSocketHandlerConfig) {
    this.authenticator = config.authenticator;
    this.presenceTracker = config.presenceTracker;
    this.pubSubPublisher = config.pubSubPublisher;
    this.logger = config.logger || new PinoRealtimeLogger('vibegrid-realtime-socket');

    this.io = new Server(httpServer, {
      path: '/socket.io/',
      cors: {
        origin: config.allowedOrigins || ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  public getIoServer(): Server {
    return this.io;
  }

  private setupMiddleware(): void {
    this.io.use((socket: Socket, next) => {
      try {
        const token = this.authenticator.extractTokenFromHandshake(socket.handshake);
        if (!token) {
          this.logger.warn('Socket connection rejected: missing authentication token', {
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication error: Missing token'));
        }

        const userPayload = this.authenticator.verifyToken(token);
        socket.data.user = userPayload;

        this.logger.info(`Socket authenticated successfully for user [${userPayload.userId}]`, {
          socketId: socket.id,
          userId: userPayload.userId,
        });

        next();
      } catch (err: any) {
        this.logger.warn('Socket authentication failed', { socketId: socket.id, error: err.message });
        next(new Error('Authentication error: Invalid or expired token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      const user = socket.data.user;
      if (!user || !user.userId) {
        socket.disconnect(true);
        return;
      }

      const userId = user.userId;
      const userRoom = `user:${userId}`;
      const modelLinkRoom = `${userId}__room`;
      socket.join(userRoom);
      socket.join(modelLinkRoom);

      this.logger.info(`Socket [${socket.id}] joined rooms [${userRoom}, ${modelLinkRoom}]`, { socketId: socket.id, userId });

      // Track Presence
      const presenceResult = await this.presenceTracker.addConnection(userId, socket.id);
      if (presenceResult?.isStateChange && presenceResult?.online) {
        const presenceEvent: PresenceEventDTO = {
          userId,
          status: 'online',
          timestamp: Date.now(),
        };
        if (this.pubSubPublisher) {
          await this.pubSubPublisher('realtime:presence', presenceEvent);
        } else {
          this.broadcastPresence(presenceEvent);
        }
      }

      // ModelLink Parity: Send active online users list to connecting socket
      try {
        const onlineUserIds = await this.presenceTracker.getOnlineUsers();
        socket.emit('get-users', onlineUserIds.map((id) => ({ userId: id, socketId: socket.id })));
      } catch (err) {
        // Non-blocking
      }

      // ModelLink Parity: Support 'joinRoom' event if emitted by client
      socket.on('joinRoom', async (requestedUserId: string) => {
        if (requestedUserId && requestedUserId === userId) {
          socket.join(`${userId}__room`);
          socket.join(`user:${userId}`);
          const onlineUserIds = await this.presenceTracker.getOnlineUsers();
          this.io.emit('get-users', onlineUserIds.map((id) => ({ userId: id, socketId: socket.id })));
        }
      });

      // ModelLink Parity: Support 'leavingRoom' event
      socket.on('leavingRoom', async () => {
        await this.presenceTracker.removeConnection(userId, socket.id);
        const onlineUserIds = await this.presenceTracker.getOnlineUsers();
        this.io.emit('get-users', onlineUserIds.map((id) => ({ userId: id, socketId: socket.id })));
      });

      // Handle chat:typing event relay (and ModelLink 'typing' / 'stopTyping')
      socket.on('chat:typing', (payload: { conversationId: string; recipientUserId: string; isTyping: boolean }) => {
        if (!payload || !payload.recipientUserId) return;
        const targetRoom = `user:${payload.recipientUserId}`;
        const targetModelLinkRoom = `${payload.recipientUserId}__room`;
        socket.to(targetRoom).to(targetModelLinkRoom).emit('chat:typing', {
          conversationId: payload.conversationId,
          userId,
          isTyping: !!payload.isTyping,
        });
      });

      socket.on('typing', (data: { conversationId: string; forId: string }) => {
        if (!data?.forId || !data?.conversationId) return;
        this.io.to(`${data.forId}__room`).to(`user:${data.forId}`).emit('typing', {
          conversationId: data.conversationId,
          fromUserId: userId,
        });
        this.io.to(`${data.forId}__room`).to(`user:${data.forId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: true,
        });
      });

      socket.on('stopTyping', (data: { conversationId: string; forId: string }) => {
        if (!data?.forId || !data?.conversationId) return;
        this.io.to(`${data.forId}__room`).to(`user:${data.forId}`).emit('stopTyping', {
          conversationId: data.conversationId,
          fromUserId: userId,
        });
        this.io.to(`${data.forId}__room`).to(`user:${data.forId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: false,
        });
      });

      // Handle message:seen event relay
      socket.on('message:seen', (data: { conversationId: string; recipientUserId: string }) => {
        if (!data?.conversationId || !data?.recipientUserId) return;
        const targetRoom = `user:${data.recipientUserId}`;
        const targetModelLinkRoom = `${data.recipientUserId}__room`;
        socket.to(targetRoom).to(targetModelLinkRoom).emit('message:seen', {
          conversationId: data.conversationId,
          seenByUserId: userId,
          seenAt: new Date().toISOString(),
        });
      });

      // Handle Disconnection
      socket.on('disconnect', async (reason) => {
        this.logger.info(`Socket [${socket.id}] disconnected (reason: ${reason})`, { socketId: socket.id, userId, reason });

        const disconnectResult = await this.presenceTracker.removeConnection(userId, socket.id);
        if (disconnectResult?.isStateChange && !disconnectResult?.online) {
          const offlineEvent: PresenceEventDTO = {
            userId,
            status: 'offline',
            timestamp: Date.now(),
          };
          if (this.pubSubPublisher) {
            await this.pubSubPublisher('realtime:presence', offlineEvent);
          } else {
            this.broadcastPresence(offlineEvent);
          }
        }
      });
    });
  }

  public emitNotificationToUser(userId: string, notification: NotificationEventDTO): void {
    const room = `user:${userId}`;
    this.io.to(room).emit('notification:new', notification);
    this.logger.info(`Emitted notification:new to room [${room}]`, { userId, notificationId: notification.id });
  }

  public emitFeedUpdateToUser(userId: string, feedSignal: FeedSignalDTO): void {
    const room = `user:${userId}`;
    this.io.to(room).emit('feed:updated', feedSignal);
    this.logger.info(`Emitted feed:updated to room [${room}]`, { userId, type: feedSignal.type });
  }

  public emitDirectMessageToUser(userId: string, messageSignal: any): void {
    const room = `user:${userId}`;
    this.io.to(room).emit('message:new', messageSignal);
    this.logger.info(`Emitted message:new to room [${room}]`, { userId, messageId: messageSignal.messageId });
  }

  public broadcastPresence(presence: PresenceEventDTO): void {
    const eventName = `presence:${presence.status}`;
    this.io.emit(eventName, presence);
    this.logger.info(`Broadcasted ${eventName} for user [${presence.userId}]`, { userId: presence.userId, status: presence.status });
  }

  public async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });
  }
}
