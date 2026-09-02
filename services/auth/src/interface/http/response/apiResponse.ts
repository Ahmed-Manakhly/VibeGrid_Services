import { Response } from 'express';
import { PaginationMeta } from '../../../domain/ports/IUserAuthRepository';

export function sendSuccess(res: Response, statusCode = 200, data: Record<string, any>): void {
  res.status(statusCode).json({
    status: 'success',
    data
  });
}

export function sendPaginated(
  res: Response,
  statusCode = 200,
  data: Record<string, any>,
  pagination: PaginationMeta
): void {
  res.status(statusCode).json({
    status: 'success',
    pagination,
    data
  });
}

export class ApiResponse {
  public static success(
    res: Response,
    data: Record<string, any>,
    statusCode = 200,
    pagination?: PaginationMeta
  ): void {
    if (pagination) {
      sendPaginated(res, statusCode, data, pagination);
    } else {
      sendSuccess(res, statusCode, data);
    }
  }

  public static sendSuccess(res: Response, statusCode = 200, data: Record<string, any> = {}): void {
    sendSuccess(res, statusCode, data);
  }

  public static sendPaginated(
    res: Response,
    statusCode = 200,
    data: Record<string, any> = {},
    pagination: PaginationMeta
  ): void {
    sendPaginated(res, statusCode, data, pagination);
  }
}
