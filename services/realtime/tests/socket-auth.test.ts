import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { TEST_PRIVATE_KEY, TEST_PUBLIC_KEY } from './helpers/testKeys';
import { SocketJwtAuthenticator } from '../src/infrastructure/auth/SocketJwtAuthenticator';
import { RealtimeSocketHandler } from '../src/interface/socket/RealtimeSocketHandler';

describe('Realtime Gateway — Socket Authentication & Authorization Tests', () => {
  let server: http.Server;
  let authenticator: SocketJwtAuthenticator;
  let socketHandler: RealtimeSocketHandler;
  let clientSocket: ClientSocket;
  let port: number;

  const mockPresenceTracker = {
    addConnection: jest.fn().mockResolvedValue({ isStateChange: true, online: true, connectionCount: 1 }),
    removeConnection: jest.fn().mockResolvedValue({ isStateChange: true, online: false, connectionCount: 0 }),
    getUserStatus: jest.fn().mockResolvedValue({ online: true, connectionCount: 1 }),
  };

  beforeAll((done: jest.DoneCallback) => {
    const app = express();
    server = http.createServer(app);
    authenticator = new SocketJwtAuthenticator(undefined, TEST_PUBLIC_KEY);

    socketHandler = new RealtimeSocketHandler(server, {
      authenticator,
      presenceTracker: mockPresenceTracker,
    });

    server.listen(0, () => {
      const addr = server.address() as any;
      port = addr.port;
      done();
    });
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await socketHandler.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    jest.clearAllMocks();
  });

  it('should authenticate connection with valid RS256 token in handshake auth', (done: jest.DoneCallback) => {
    const token = jwt.sign(
      { sub: 'user_test_123', email: 'test@vibegrid.com', role: 'USER' },
      TEST_PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    clientSocket = Client(`http://localhost:${port}`, {
      path: '/socket.io/',
      auth: { token },
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      expect(mockPresenceTracker.addConnection).toHaveBeenCalledWith('user_test_123', clientSocket.id);
      done();
    });
  });

  it('should authenticate connection with valid RS256 token in handshake query', (done: jest.DoneCallback) => {
    const token = jwt.sign(
      { sub: 'user_query_456', email: 'query@vibegrid.com', role: 'USER' },
      TEST_PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    clientSocket = Client(`http://localhost:${port}`, {
      path: '/socket.io/',
      query: { token },
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      expect(mockPresenceTracker.addConnection).toHaveBeenCalledWith('user_query_456', clientSocket.id);
      done();
    });
  });

  it('should reject socket connection when token is missing', (done: jest.DoneCallback) => {
    clientSocket = Client(`http://localhost:${port}`, {
      path: '/socket.io/',
    });

    clientSocket.on('connect_error', (err) => {
      expect(err.message).toContain('Missing token');
      expect(clientSocket.connected).toBe(false);
      done();
    });
  });

  it('should reject socket connection when token signature is invalid', (done: jest.DoneCallback) => {
    const invalidToken = jwt.sign({ sub: 'user_hacker' }, 'wrong_secret', { algorithm: 'HS256' });

    clientSocket = Client(`http://localhost:${port}`, {
      path: '/socket.io/',
      auth: { token: invalidToken },
    });

    clientSocket.on('connect_error', (err) => {
      expect(err.message).toContain('Invalid or expired token');
      expect(clientSocket.connected).toBe(false);
      done();
    });
  });
});
