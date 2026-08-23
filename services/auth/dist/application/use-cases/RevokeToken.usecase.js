"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevokeTokenUseCase = void 0;
const RevokedToken_entity_1 = require("../../domain/entities/RevokedToken.entity");
class RevokeTokenUseCase {
    revokedTokenRepo;
    constructor(revokedTokenRepo) {
        this.revokedTokenRepo = revokedTokenRepo;
    }
    async execute(input) {
        if (!input.token)
            return;
        const revokedToken = RevokedToken_entity_1.RevokedToken.create({
            token: input.token,
            type: input.type,
            expiresAt: input.expiresAt
        });
        await this.revokedTokenRepo.revoke(revokedToken);
    }
}
exports.RevokeTokenUseCase = RevokeTokenUseCase;
