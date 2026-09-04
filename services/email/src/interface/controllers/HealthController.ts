import express, { Request, Response } from 'express';

export class HealthController {
  public static getHealth(req: Request, res: Response) {
    res.status(200).json({
      status: 'ok',
      service: 'email-service',
      timestamp: new Date().toISOString(),
    });
  }
}
