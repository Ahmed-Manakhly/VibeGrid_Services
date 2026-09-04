export interface IProfileRepository {
  initProfileIfMissing(userId: string, data: { email: string; name?: string }): Promise<{ created: boolean; user: any }>;
}
