"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRevokedTokenRepo = void 0;
const RevokedTokenSchema_1 = require("./schemas/RevokedTokenSchema");
class MongoRevokedTokenRepo {
    async revoke(token) {
        await RevokedTokenSchema_1.RevokedTokenModel.create({
            token: token.token,
            type: token.type,
            revokedAt: token.revokedAt,
            expiresAt: token.expiresAt
        });
    }
    async isRevoked(token) {
        const doc = await RevokedTokenSchema_1.RevokedTokenModel.findOne({ token }).lean();
        return !!doc;
    }
}
exports.MongoRevokedTokenRepo = MongoRevokedTokenRepo;
