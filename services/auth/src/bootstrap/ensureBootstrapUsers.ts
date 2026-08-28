import { AppConfig } from '../config/env';
import { AdminCreateUserUseCase } from '../application/use-cases/AdminCreateUser.usecase';
import { MongoUserAuthRepo } from '../infrastructure/persistence/MongoUserAuthRepo';

export async function ensureBootstrapUsers(
  config: AppConfig,
  userAuthRepo: MongoUserAuthRepo,
  adminCreateUserUseCase: AdminCreateUserUseCase
): Promise<void> {
  // 1. Dev User Bootstrap
  if (config.bootstrapDev?.email && config.bootstrapDev?.password) {
    const existingDev = await userAuthRepo.findByEmail(config.bootstrapDev.email);
    if (!existingDev) {
      try {
        await adminCreateUserUseCase.execute({
          email: config.bootstrapDev.email,
          password: config.bootstrapDev.password,
          name: config.bootstrapDev.name || 'Developer',
          role: 'SUPER_ADMIN',
          isActive: true
        });
        console.log(`✅ Bootstrap developer user created: ${config.bootstrapDev.email}`);
      } catch (err: any) {
        console.log(`ℹ️ Bootstrap developer creation note: ${err.message}`);
      }
    }
  }

  // 2. System Admin User Bootstrap
  if (config.bootstrapAdmin?.email && config.bootstrapAdmin?.password) {
    const existingAdmin = await userAuthRepo.findByEmail(config.bootstrapAdmin.email);
    if (!existingAdmin) {
      try {
        await adminCreateUserUseCase.execute({
          email: config.bootstrapAdmin.email,
          password: config.bootstrapAdmin.password,
          name: config.bootstrapAdmin.name || 'System Admin',
          role: 'ADMIN',
          isActive: true
        });
        console.log(`✅ Bootstrap admin user created: ${config.bootstrapAdmin.email}`);
      } catch (err: any) {
        console.log(`ℹ️ Bootstrap admin creation note: ${err.message}`);
      }
    }
  }
}
