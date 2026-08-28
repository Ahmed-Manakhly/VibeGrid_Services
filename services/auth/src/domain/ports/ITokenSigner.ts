export interface ITokenSigner {
  getPublicKey(): string;
  signAccessToken(payload: { sub: string; email: string; role: string }): string;
  verifyAccessToken(token: string): any;
}
