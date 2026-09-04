import { PrismaClient } from '@prisma/client';
import { IProfileRepository } from '../../domain/ports/IProfileRepository';

export class PrismaProfileRepository implements IProfileRepository {
  constructor(private prisma: PrismaClient) {}

  public async initProfileIfMissing(
    userId: string,
    data: { email: string; name?: string }
  ): Promise<{ created: boolean; user: any }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      return { created: false, user: existing };
    }

    const emailPrefix = data.email.split('@')[0];
    const cleanPrefix = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const fallbackUsername = cleanPrefix || `user_${userId.slice(-6)}`;
    const baseUsername = fallbackUsername.slice(0, 18);

    // Ensure username uniqueness
    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}_${counter}`;
      counter++;
    }

    const newUser = await this.prisma.user.create({
      data: {
        id: userId,
        email: data.email,
        username,
        name: data.name || username,
      },
    });

    return { created: true, user: newUser };
  }
}
