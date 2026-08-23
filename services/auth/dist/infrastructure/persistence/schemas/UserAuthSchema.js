"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAuthModel = void 0;
const mongoose_1 = require("mongoose");
const UserAuthSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    name: { type: String },
    provider: { type: String, required: true, default: 'local' },
    providerId: { type: String, index: true },
    role: { type: String, required: true, default: 'USER' }
}, { timestamps: true });
exports.UserAuthModel = (0, mongoose_1.model)('UserAuth', UserAuthSchema);
