import { Request, Response } from 'express';

export class HealthController {
  public static getHealth(req: Request, res: Response): void {
    res.status(200).json({
      status: 'UP',
      service: 'onboarding-worker',
      timestamp: new Date().toISOString(),
    });
  }
}
