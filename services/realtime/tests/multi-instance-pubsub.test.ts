import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { TEST_PRIVATE_KEY, TEST_PUBLIC_KEY } from './helpers/testKeys';
import { SocketJwtAuthenticator } from '../src/infrastructure/auth/SocketJwtAuthenticator';
import { RealtimeSocketHandler } from '../src/interface/socket/RealtimeSocketHandler';

describe('Realtime Gateway — Cross-Instance Redis Pub/Sub Event Broadcast Tests', () => {
  let serverA: http.Server;
  let serverB: http.Server;
  let handlerA: RealtimeSocketHandler;
  let handlerB: RealtimeSocketHandler;
  let clientSocketOnNodeB: ClientSocket;
  let portA: number;
  let portB: number;

  const mockPresenceTracker = {
    addConnection: jest.fn().mockResolvedValue({ isStateChange: true, online: true, connectionCount: 1 }),
    removeConnection: jest.fn().mockResolvedValue({ isStateChange: true, online: false, connectionCount: 0 }),
    getUserStatus: jest.fn().mockResolvedValue({ online: true, connectionCount: 1 }),
  };

  beforeAll((done: jest.DoneCallback) => {
    const authenticator = new SocketJwtAuthenticator(undefined, TEST_PUBLIC_KEY);

    // Node A
    const appA = express();
    serverA = http.createServer(appA);
    handlerA = new RealtimeSocketHandler(serverA, {
      authenticator,
      presenceTracker: mockPresenceTracker,
    });

    // Node B
    const appB = express();
    serverB = http.createServer(appB);
    handlerB = new RealtimeSocketHandler(serverB, {
      authenticator,
      presenceTracker: mockPresenceTracker,
    });

    serverA.listen(0, () => {
      portA = (serverA.address() as any).port;
      serverB.listen(0, () => {
        portB = (serverB.address() as any).port;
        done();
      });
    });
  });

  afterAll(async () => {
    if (clientSocketOnNodeB && clientSocketOnNodeB.connected) {
      clientSocketOnNodeB.disconnect();
    }
    await handlerA.close();
    await handlerB.close();
    await new Promise<void>((resolve) => serverA.close(() => resolve()));
    await new Promise<void>((resolve) => serverB.close(() => resolve()));
  });

  it('should deliver notification:new to client connected on Node B when emitted targeting room user:target_user', (done: jest.DoneCallback) => {
    const token = jwt.sign(
      { sub: 'target_user_789', email: 'target@vibegrid.com', role: 'USER' },
      TEST_PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    // Connect client to Node B
    clientSocketOnNodeB = Client(`http://localhost:${portB}`, {
      path: '/socket.io/',
      auth: { token },
    });

    clientSocketOnNodeB.on('connect', () => {
      // Simulate Pub/Sub routing event to Node B's handler
      const notificationPayload = {
        id: 'notif_pubsub_100',
        type: 'FOLLOW',
        userId: 'target_user_789',
        creatorId: 'follower_user_01',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      clientSocketOnNodeB.on('notification:new', (receivedNotif) => {
        expect(receivedNotif.id).toBe('notif_pubsub_100');
        expect(receivedNotif.type).toBe('FOLLOW');
        expect(receivedNotif.creatorId).toBe('follower_user_01');
        done();
      });

      // Node B emits event to user room user:target_user_789
      handlerB.emitNotificationToUser('target_user_789', notificationPayload);
    });
  });

  it('should deliver feed:updated to client connected on Node B', (done: jest.DoneCallback) => {
    const token = jwt.sign(
      { sub: 'target_user_789', email: 'target@vibegrid.com', role: 'USER' },
      TEST_PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    clientSocketOnNodeB = Client(`http://localhost:${portB}`, {
      path: '/socket.io/',
      auth: { token },
    });

    clientSocketOnNodeB.on('connect', () => {
      const feedSignal = {
        type: 'new_content' as const,
        postId: 'post_vibegrid_555',
      };

      clientSocketOnNodeB.on('feed:updated', (signal) => {
        expect(signal.type).toBe('new_content');
        expect(signal.postId).toBe('post_vibegrid_555');
        done();
      });

      handlerB.emitFeedUpdateToUser('target_user_789', feedSignal);
    });
  });
});
