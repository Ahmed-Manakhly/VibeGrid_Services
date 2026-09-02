import { AppConfig } from '../config/env';
import { AdminCreateUserUseCase } from '../application/use-cases/AdminCreateUser.usecase';
import { MongoUserAuthRepo } from '../infrastructure/persistence/MongoUserAuthRepo';

export async function ensureBootstrapUsers(
  config: AppConfig,
  userAuthRepo: MongoUserAuthRepo,
  adminCreateUserUseCase: AdminCreateUserUseCase
): Promise<void> {

  // ── 1. Bootstrap SUPER_ADMIN (Developer) ────────────────────────────────
  if (config.bootstrapDev?.email && config.bootstrapDev?.password) {
    const existing = await userAuthRepo.findByEmail(config.bootstrapDev.email.toLowerCase());
    if (existing) {
      console.log(`ℹ️  Bootstrap dev user already exists — skipping: ${config.bootstrapDev.email}`);
    } else {
      try {
        await adminCreateUserUseCase.execute({
          email: config.bootstrapDev.email,
          password: config.bootstrapDev.password,
          name: config.bootstrapDev.name || 'Developer',
          role: 'SUPER_ADMIN',
          isActive: true,
          isEmailVerified: true   // Bootstrap users bypass OTP — account is trusted from config
        });
        console.log(`✅ Bootstrap dev user created: ${config.bootstrapDev.email}`);
      } catch (err: any) {
        console.log(`ℹ️  Bootstrap dev user note: ${err.message}`);
      }
    }
  }

  // ── 2. Bootstrap ADMIN (System Admin) ────────────────────────────────────
  if (config.bootstrapAdmin?.email && config.bootstrapAdmin?.password) {
    // First check if an admin with this exact email already exists
    const existingByEmail = await userAuthRepo.findByEmail(config.bootstrapAdmin.email.toLowerCase());
    if (existingByEmail) {
      console.log(`ℹ️  Bootstrap admin user already exists — skipping: ${config.bootstrapAdmin.email}`);
    } else {
      // Also guard: if ANY admin already exists in the DB don't create a duplicate
      const anyAdmin = await userAuthRepo.findFirstByRole('ADMIN');
      if (anyAdmin) {
        console.log(`ℹ️  An ADMIN user already exists in the DB — skipping bootstrap admin creation.`);
      } else {
        try {
          await adminCreateUserUseCase.execute({
            email: config.bootstrapAdmin.email,
            password: config.bootstrapAdmin.password,
            name: config.bootstrapAdmin.name || 'System Admin',
            role: 'ADMIN',
            isActive: true,
            isEmailVerified: true   // Bootstrap users bypass OTP — account is trusted from config
          });
          console.log(`✅ Bootstrap admin user created: ${config.bootstrapAdmin.email}`);
        } catch (err: any) {
          console.log(`ℹ️  Bootstrap admin user note: ${err.message}`);
        }
      }
    }
  }
}

