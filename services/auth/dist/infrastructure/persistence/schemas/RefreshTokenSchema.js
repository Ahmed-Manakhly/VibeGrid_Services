"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenModel = void 0;
const mongoose_1 = require("mongoose");
const RefreshTokenSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    isRevoked: { type: Boolean, required: true, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });
exports.RefreshTokenModel = (0, mongoose_1.model)('RefreshToken', RefreshTokenSchema);
