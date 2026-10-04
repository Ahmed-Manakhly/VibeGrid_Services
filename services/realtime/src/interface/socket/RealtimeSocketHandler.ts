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
      socket.join(userRoom);

      this.logger.info(`Socket [${socket.id}] joined room [${userRoom}]`, { socketId: socket.id, userId, room: userRoom });

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
