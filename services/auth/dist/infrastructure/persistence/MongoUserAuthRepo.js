"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoUserAuthRepo = void 0;
const UserAuth_entity_1 = require("../../domain/entities/UserAuth.entity");
const UserAuthSchema_1 = require("./schemas/UserAuthSchema");
class MongoUserAuthRepo {
    toDomain(doc) {
        return UserAuth_entity_1.UserAuth.create({
            id: doc._id.toString(),
            email: doc.email,
            passwordHash: doc.passwordHash,
            name: doc.name,
            provider: doc.provider,
            providerId: doc.providerId,
            role: doc.role,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        });
    }
    async findByEmail(email) {
        const doc = await UserAuthSchema_1.UserAuthModel.findOne({ email }).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findById(id) {
        const doc = await UserAuthSchema_1.UserAuthModel.findById(id).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByProvider(provider, providerId) {
        const doc = await UserAuthSchema_1.UserAuthModel.findOne({ provider, providerId }).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async save(userAuth) {
        if (userAuth.id) {
            const doc = await UserAuthSchema_1.UserAuthModel.findByIdAndUpdate(userAuth.id, {
                email: userAuth.email,
                passwordHash: userAuth.passwordHash,
                name: userAuth.name,
                provider: userAuth.provider,
                providerId: userAuth.providerId,
                role: userAuth.role
            }, { new: true }).exec();
            return this.toDomain(doc);
        }
        else {
            const doc = await UserAuthSchema_1.UserAuthModel.create({
                email: userAuth.email,
                passwordHash: userAuth.passwordHash,
                name: userAuth.name,
                provider: userAuth.provider,
                providerId: userAuth.providerId,
                role: userAuth.role
            });
            return this.toDomain(doc);
        }
    }
}
exports.MongoUserAuthRepo = MongoUserAuthRepo;
