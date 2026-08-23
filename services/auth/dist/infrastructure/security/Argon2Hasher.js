"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Argon2Hasher = void 0;
const argon2_1 = __importDefault(require("argon2"));
class Argon2Hasher {
    async hash(password) {
        return argon2_1.default.hash(password, {
            type: argon2_1.default.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3
        });
    }
    async verify(password, hash) {
        try {
            return await argon2_1.default.verify(hash, password);
        }
        catch {
            return false;
        }
    }
}
exports.Argon2Hasher = Argon2Hasher;
