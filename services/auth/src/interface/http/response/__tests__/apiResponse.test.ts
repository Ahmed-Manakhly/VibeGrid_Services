import { Response } from 'express';
import { ApiResponse } from '../apiResponse';

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: any) => {
    res.body = payload;
    return res;
  });
  return res as Response;
}

describe('ApiResponse Helper', () => {
  it('should format standard success response without pagination', () => {
    const res = createMockRes();
    ApiResponse.success(res, { user: { id: '1', email: 'test@example.com' } }, 200);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { user: { id: '1', email: 'test@example.com' } }
    });
  });

  it('should format standard success response with custom status code', () => {
    const res = createMockRes();
    ApiResponse.success(res, { message: 'Created successfully' }, 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { message: 'Created successfully' }
    });
  });

  it('should include pagination metadata when provided', () => {
    const res = createMockRes();
    const paginationMeta = {
      total: 50,
      page: 2,
      limit: 10,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: true
    };

    ApiResponse.success(res, { users: [] }, 200, paginationMeta);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      pagination: paginationMeta,
      data: { users: [] }
    });
  });
});
