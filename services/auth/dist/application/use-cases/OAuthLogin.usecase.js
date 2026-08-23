"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthLoginUseCase = void 0;
const UserAuth_entity_1 = require("../../domain/entities/UserAuth.entity");
const UserRegistered_event_1 = require("../../domain/events/UserRegistered.event");
const RefreshToken_entity_1 = require("../../domain/entities/RefreshToken.entity");
const crypto_1 = __importDefault(require("crypto"));
class OAuthLoginUseCase {
    userAuthRepo;
    refreshTokenRepo;
    eventPublisher;
    tokenSigner;
    constructor(userAuthRepo, refreshTokenRepo, eventPublisher, tokenSigner) {
        this.userAuthRepo = userAuthRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.eventPublisher = eventPublisher;
        this.tokenSigner = tokenSigner;
    }
    async execute(dto) {
        let user = await this.userAuthRepo.findByProvider(dto.provider, dto.providerId);
        let isNewUser = false;
        if (!user) {
            // Check if user exists by email
            user = await this.userAuthRepo.findByEmail(dto.email);
            if (!user) {
                // Create new user aggregate
                user = UserAuth_entity_1.UserAuth.create({
                    email: dto.email,
                    name: dto.name,
                    provider: dto.provider,
                    providerId: dto.providerId
                });
                isNewUser = true;
            }
            user = await this.userAuthRepo.save(user);
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
        // Publish event if brand new OAuth user
        if (isNewUser) {
            const registeredEvent = new UserRegistered_event_1.UserRegisteredEvent({
                userId,
                email: user.email,
                name: user.name,
                provider: dto.provider,
                registeredAt: new Date(),
                version: 1
            });
            await this.eventPublisher.publish(registeredEvent.eventName, registeredEvent.payload);
        }
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
exports.OAuthLoginUseCase = OAuthLoginUseCase;
