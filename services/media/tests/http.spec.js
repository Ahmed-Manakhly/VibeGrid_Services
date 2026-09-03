"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const mediaAuthMiddleware_1 = require("../src/interface/http/middleware/mediaAuthMiddleware");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('Media HTTP Endpoints & Auth Middleware', () => {
    const privateKey = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../auth/secrets/jwt.private.key'), 'utf8');
    const publicKey = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../auth/secrets/jwt.public.key'), 'utf8');
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const authMiddleware = (0, mediaAuthMiddleware_1.createMediaAuthMiddleware)(path_1.default.resolve(__dirname, '../../auth/secrets/jwt.public.key'));
    app.get('/test-protected', authMiddleware, (req, res) => {
        res.json({ status: 'success', user: req.user });
    });
    it('should reject unauthenticated request with 401', async () => {
        const res = await (0, supertest_1.default)(app).get('/test-protected');
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Authentication required');
    });
    it('should accept valid RS256 JWT in Authorization header', async () => {
        const token = jsonwebtoken_1.default.sign({ sub: 'usr_123', email: 'test@example.com', role: 'USER' }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
        const res = await (0, supertest_1.default)(app)
            .get('/test-protected')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.userId).toBe('usr_123');
        expect(res.body.user.email).toBe('test@example.com');
    });
});
