import { Request, Response } from 'express';
import Redis from 'ioredis';
import { Server as SocketIoServer } from 'socket.io';

export class HealthController {
  public static createHandler(redisUrl: string, ioServerProvider: () => SocketIoServer | null) {
    return async (req: Request, res: Response): Promise<void> => {
      let redisConnected = false;
      try {
        const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 1000 });
        const ping = await client.ping();
        redisConnected = ping === 'PONG';
        client.disconnect();
      } catch {
        redisConnected = false;
      }

      const io = ioServerProvider();
      const socketClientsCount = io ? io.engine.clientsCount : 0;

      const isReady = redisConnected && !!io;

      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'healthy' : 'degraded',
        service: 'vibegrid-realtime-gateway',
        timestamp: new Date().toISOString(),
        redisConnected,
        socketClientsCount,
      });
    };
  }
}
