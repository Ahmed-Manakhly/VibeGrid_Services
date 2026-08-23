"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRefreshTokenRepo = void 0;
const RefreshToken_entity_1 = require("../../domain/entities/RefreshToken.entity");
const RefreshTokenSchema_1 = require("./schemas/RefreshTokenSchema");
class MongoRefreshTokenRepo {
    toDomain(doc) {
        return RefreshToken_entity_1.RefreshToken.create({
            id: doc._id.toString(),
            userId: doc.userId,
            tokenHash: doc.tokenHash,
            familyId: doc.familyId,
            isRevoked: doc.isRevoked,
            expiresAt: doc.expiresAt,
            createdAt: doc.createdAt
        });
    }
    async save(token) {
        if (token.id) {
            const doc = await RefreshTokenSchema_1.RefreshTokenModel.findByIdAndUpdate(token.id, { isRevoked: token.isRevoked }, { new: true }).exec();
            return this.toDomain(doc);
        }
        else {
            const doc = await RefreshTokenSchema_1.RefreshTokenModel.create({
                userId: token.userId,
                tokenHash: token.tokenHash,
                familyId: token.familyId,
                isRevoked: token.isRevoked,
                expiresAt: token.expiresAt
            });
            return this.toDomain(doc);
        }
    }
    async findByTokenHash(tokenHash) {
        const doc = await RefreshTokenSchema_1.RefreshTokenModel.findOne({ tokenHash }).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async revokeFamily(familyId) {
        await RefreshTokenSchema_1.RefreshTokenModel.updateMany({ familyId }, { isRevoked: true }).exec();
    }
}
exports.MongoRefreshTokenRepo = MongoRefreshTokenRepo;
