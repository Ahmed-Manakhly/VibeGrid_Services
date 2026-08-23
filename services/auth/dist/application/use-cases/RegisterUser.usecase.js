"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterUserUseCase = void 0;
const UserAuth_entity_1 = require("../../domain/entities/UserAuth.entity");
const UserRegistered_event_1 = require("../../domain/events/UserRegistered.event");
const RefreshToken_entity_1 = require("../../domain/entities/RefreshToken.entity");
const crypto_1 = __importDefault(require("crypto"));
class RegisterUserUseCase {
    userAuthRepo;
    refreshTokenRepo;
    hasher;
    eventPublisher;
    tokenSigner;
    constructor(userAuthRepo, refreshTokenRepo, hasher, eventPublisher, tokenSigner) {
        this.userAuthRepo = userAuthRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.hasher = hasher;
        this.eventPublisher = eventPublisher;
        this.tokenSigner = tokenSigner;
    }
    async execute(dto) {
        const existing = await this.userAuthRepo.findByEmail(dto.email);
        if (existing) {
            throw new Error('Email already registered');
        }
        const hashedPassword = await this.hasher.hash(dto.password);
        const newUser = UserAuth_entity_1.UserAuth.create({
            email: dto.email,
            passwordHash: hashedPassword,
            name: dto.name,
            provider: 'local'
        });
        const savedUser = await this.userAuthRepo.save(newUser);
        const userId = savedUser.id;
        // Issue RS256 Access Token
        const accessToken = this.tokenSigner.signAccessToken({
            sub: userId,
            email: savedUser.email,
            role: savedUser.role
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
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        await this.refreshTokenRepo.save(refreshTokenEntity);
        // Publish Event-Driven Message (Pub/Sub)
        const registeredEvent = new UserRegistered_event_1.UserRegisteredEvent({
            userId,
            email: savedUser.email,
            name: savedUser.name,
            provider: 'local',
            registeredAt: new Date(),
            version: 1
        });
        await this.eventPublisher.publish(registeredEvent.eventName, registeredEvent.payload);
        return {
            accessToken,
            refreshToken: `${familyId}:${rawRefreshToken}`,
            user: {
                id: userId,
                email: savedUser.email,
                name: savedUser.name,
                role: savedUser.role
            }
        };
    }
}
exports.RegisterUserUseCase = RegisterUserUseCase;
