"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RS256TokenSigner = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class RS256TokenSigner {
    privateKey;
    publicKey;
    constructor(privateKeyPath, publicKeyPath) {
        const defaultPrivatePath = path_1.default.resolve(__dirname, '../../../secrets/jwt.private.key');
        const defaultPublicPath = path_1.default.resolve(__dirname, '../../../secrets/jwt.public.key');
        const privPath = privateKeyPath || process.env.JWT_PRIVATE_KEY_PATH || defaultPrivatePath;
        const pubPath = publicKeyPath || process.env.JWT_PUBLIC_KEY_PATH || defaultPublicPath;
        this.privateKey = fs_1.default.readFileSync(privPath, 'utf8');
        this.publicKey = fs_1.default.readFileSync(pubPath, 'utf8');
    }
    getPublicKey() {
        return this.publicKey;
    }
    signAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: '15m',
            issuer: 'vibegrid-auth-service'
        });
    }
    verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, this.publicKey, {
            algorithms: ['RS256'],
            issuer: 'vibegrid-auth-service'
        });
    }
}
exports.RS256TokenSigner = RS256TokenSigner;
