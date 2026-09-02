import { Response } from 'express';
import { PaginationMeta } from '../../../domain/ports/IUserAuthRepository';

export class ApiResponse {
  public static success(
    res: Response,
    data: Record<string, any>,
    statusCode = 200,
    pagination?: PaginationMeta
  ): void {
    const payload: Record<string, any> = {
      status: 'success'
    };

    if (pagination) {
      payload.pagination = pagination;
    }

    payload.data = data;

    res.status(statusCode).json(payload);
  }
}
