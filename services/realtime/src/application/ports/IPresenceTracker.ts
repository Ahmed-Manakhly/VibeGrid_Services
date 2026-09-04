export interface UserPresenceResult {
  isStateChange: boolean;
  online: boolean;
  connectionCount: number;
}

export interface IPresenceTracker {
  addConnection(userId: string, socketId: string): Promise<UserPresenceResult>;
  removeConnection(userId: string, socketId: string): Promise<UserPresenceResult>;
  getUserStatus(userId: string): Promise<{ online: boolean; connectionCount: number }>;
}
