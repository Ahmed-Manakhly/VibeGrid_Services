export interface RegisterDTO {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
  role?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    isEmailVerified?: boolean;
  };
}

export interface OAuthDTO {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name?: string;
}

export interface RegisterResultDTO {
  isVerificationRequired: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    isEmailVerified: boolean;
  };
}
