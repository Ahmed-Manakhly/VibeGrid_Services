"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticateUseCase = void 0;
const RefreshToken_entity_1 = require("../../domain/entities/RefreshToken.entity");
const crypto_1 = __importDefault(require("crypto"));
class AuthenticateUseCase {
    userAuthRepo;
    refreshTokenRepo;
    hasher;
    tokenSigner;
    constructor(userAuthRepo, refreshTokenRepo, hasher, tokenSigner) {
        this.userAuthRepo = userAuthRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.hasher = hasher;
        this.tokenSigner = tokenSigner;
    }
    async execute(dto) {
        const user = await this.userAuthRepo.findByEmail(dto.email);
        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }
        const isValid = await this.hasher.verify(dto.password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }
        const userId = user.id;
        // Issue RS256 Access Token
        const accessToken = this.tokenSigner.signAccessToken({
            sub: userId,
            email: user.email,
            role: user.role
        });
        // Issue Refresh Token & Store in Mongo
        const familyId = crypto_1.default.randomUUID();
        const rawRefreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawRefreshToken).digest('hex');
        const refreshTokenEntity = RefreshToken_entity_1.RefreshToken.create({
            userId,
            tokenHash,
            familyId,
            isRevoked: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await this.refreshTokenRepo.save(refreshTokenEntity);
        return {
            accessToken,
            refreshToken: `${familyId}:${rawRefreshToken}`,
            user: {
                id: userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        };
    }
}
exports.AuthenticateUseCase = AuthenticateUseCase;
