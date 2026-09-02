import { Response } from 'express';
import { ApiResponse, sendSuccess, sendPaginated } from '../apiResponse';

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

describe('ApiResponse & Standard HTTP Response Factory Helpers', () => {
  it('sendSuccess should format standard non-paginated success response', () => {
    const res = createMockRes();
    sendSuccess(res, 200, { user: { id: '1', email: 'test@example.com' } });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { user: { id: '1', email: 'test@example.com' } }
    });
  });

  it('sendSuccess should support custom status codes e.g. 201', () => {
    const res = createMockRes();
    sendSuccess(res, 201, { message: 'Created successfully' });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { message: 'Created successfully' }
    });
  });

  it('sendPaginated should format standard paginated response with pagination metadata', () => {
    const res = createMockRes();
    const paginationMeta = {
      total: 50,
      page: 2,
      limit: 10,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: true
    };

    sendPaginated(res, 200, { users: [] }, paginationMeta);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      pagination: paginationMeta,
      data: { users: [] }
    });
  });

  it('ApiResponse class methods should delegate cleanly to sendSuccess and sendPaginated', () => {
    const res = createMockRes();
    ApiResponse.success(res, { ok: true }, 200);

    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { ok: true }
    });
  });
});
