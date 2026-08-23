"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenUseCase = void 0;
const RefreshToken_entity_1 = require("../../domain/entities/RefreshToken.entity");
const crypto_1 = __importDefault(require("crypto"));
class RefreshTokenUseCase {
    refreshTokenRepo;
    userAuthRepo;
    tokenSigner;
    constructor(refreshTokenRepo, userAuthRepo, tokenSigner) {
        this.refreshTokenRepo = refreshTokenRepo;
        this.userAuthRepo = userAuthRepo;
        this.tokenSigner = tokenSigner;
    }
    async execute(fullRefreshToken) {
        const parts = fullRefreshToken.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid refresh token format');
        }
        const [familyId, rawToken] = parts;
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const existingToken = await this.refreshTokenRepo.findByTokenHash(tokenHash);
        // Reuse detection: if token missing or revoked, revoke entire family
        if (!existingToken || existingToken.isRevoked) {
            await this.refreshTokenRepo.revokeFamily(familyId);
            throw new Error('Refresh token reuse detected or token revoked');
        }
        if (existingToken.expiresAt < new Date()) {
            throw new Error('Refresh token expired');
        }
        // Revoke old token
        existingToken.revoke();
        await this.refreshTokenRepo.save(existingToken);
        // Retrieve user for fresh claims
        const user = await this.userAuthRepo.findById(existingToken.userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Issue new access token
        const newAccessToken = this.tokenSigner.signAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role
        });
        // Issue new rotated refresh token in same family
        const newRawToken = crypto_1.default.randomBytes(40).toString('hex');
        const newTokenHash = crypto_1.default.createHash('sha256').update(newRawToken).digest('hex');
        const newTokenEntity = RefreshToken_entity_1.RefreshToken.create({
            userId: user.id,
            tokenHash: newTokenHash,
            familyId,
            isRevoked: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await this.refreshTokenRepo.save(newTokenEntity);
        return {
            accessToken: newAccessToken,
            refreshToken: `${familyId}:${newRawToken}`
        };
    }
}
exports.RefreshTokenUseCase = RefreshTokenUseCase;
