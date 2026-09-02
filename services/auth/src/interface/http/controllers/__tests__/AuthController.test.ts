import { Request, Response } from 'express';
import { AuthController } from '../AuthController';

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.cookies = {};
  res.cookie = jest.fn().mockImplementation((name: string, value: string, options: any) => {
    res.cookies[name] = { value, options };
    return res;
  });
  res.clearCookie = jest.fn().mockImplementation((name: string) => {
    delete res.cookies[name];
    return res;
  });
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: any) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('AuthController Response Contract & Cookie Issuance', () => {
  let mockRegisterUseCase: any;
  let mockAuthenticateUseCase: any;
  let mockRefreshTokenUseCase: any;
  let mockRevokeTokenUseCase: any;
  let mockRequestPasswordResetUseCase: any;
  let mockResetPasswordUseCase: any;
  let mockChangePasswordUseCase: any;
  let mockGetMeUseCase: any;
  let mockUpdateMeUseCase: any;
  let mockValidateTokenGuardUseCase: any;
  let mockTokenSigner: any;

  let controller: AuthController;

  beforeEach(() => {
    mockRegisterUseCase = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access_jwt_xyz',
        refreshToken: 'family_1:raw_refresh_xyz',
        user: { id: 'u1', email: 'user@example.com', name: 'User One', role: 'CLIENT' }
      })
    };

    mockAuthenticateUseCase = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access_jwt_xyz',
        refreshToken: 'family_1:raw_refresh_xyz',
        user: { id: 'u1', email: 'user@example.com', name: 'User One', role: 'CLIENT' }
      })
    };

    mockRefreshTokenUseCase = {};
    mockRevokeTokenUseCase = {};
    mockRequestPasswordResetUseCase = {};
    mockResetPasswordUseCase = {};
    mockChangePasswordUseCase = {};
    mockGetMeUseCase = {};
    mockUpdateMeUseCase = {};
    mockValidateTokenGuardUseCase = {};
    mockTokenSigner = {};

    controller = new AuthController(
      mockRegisterUseCase,
      mockAuthenticateUseCase,
      mockRefreshTokenUseCase,
      mockRevokeTokenUseCase,
      mockRequestPasswordResetUseCase,
      mockResetPasswordUseCase,
      mockChangePasswordUseCase,
      mockGetMeUseCase,
      mockUpdateMeUseCase,
      mockValidateTokenGuardUseCase,
      mockTokenSigner
    );
  });

  it('should return standardized success JSON without tokens or sensitive fields for register and issue HttpOnly cookies', async () => {
    const req = {
      body: {
        email: 'user@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        name: 'User One'
      }
    } as Request;

    const res = createMockRes();

    await controller.register(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual({
      status: 'success',
      data: {
        message: 'User registered successfully',
        user: {
          id: 'u1',
          email: 'user@example.com',
          name: 'User One',
          role: 'CLIENT'
        }
      }
    });

    // Ensure NO tokens or secrets in JSON
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.failedAttempts).toBeUndefined();

    // Ensure HttpOnly cookies are set correctly
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access_jwt_xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'family_1:raw_refresh_xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
  });

  it('should return standardized success JSON without tokens or sensitive fields for login and issue HttpOnly cookies', async () => {
    const req = {
      body: {
        email: 'user@example.com',
        password: 'Password123!'
      }
    } as Request;

    const res = createMockRes();

    await controller.login(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      status: 'success',
      data: {
        message: 'Authenticated successfully',
        user: {
          id: 'u1',
          email: 'user@example.com',
          name: 'User One',
          role: 'CLIENT'
        }
      }
    });

    // Ensure NO tokens or secrets in JSON
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    // Ensure HttpOnly cookies are set correctly
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access_jwt_xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'family_1:raw_refresh_xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
  });
});
