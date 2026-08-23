"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const MongoUserAuthRepo_1 = require("../infrastructure/persistence/MongoUserAuthRepo");
const MongoRefreshTokenRepo_1 = require("../infrastructure/persistence/MongoRefreshTokenRepo");
const MongoRevokedTokenRepo_1 = require("../infrastructure/persistence/MongoRevokedTokenRepo");
const Argon2Hasher_1 = require("../infrastructure/security/Argon2Hasher");
const RS256TokenSigner_1 = require("../infrastructure/security/RS256TokenSigner");
const RabbitMQPublisher_1 = require("../infrastructure/messaging/RabbitMQPublisher");
const RegisterUser_usecase_1 = require("../application/use-cases/RegisterUser.usecase");
const Authenticate_usecase_1 = require("../application/use-cases/Authenticate.usecase");
const RefreshToken_usecase_1 = require("../application/use-cases/RefreshToken.usecase");
const RevokeToken_usecase_1 = require("../application/use-cases/RevokeToken.usecase");
const OAuthLogin_usecase_1 = require("../application/use-cases/OAuthLogin.usecase");
const AuthController_1 = require("./http/controllers/AuthController");
const OAuthController_1 = require("./http/controllers/OAuthController");
const auth_routes_1 = require("./http/routes/auth.routes");
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://vibegrid_mongo:27017/auth_db';
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://vibegrid_rabbitmq:5672';
async function bootstrap() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.use((0, cors_1.default)({ origin: true, credentials: true }));
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', service: 'auth-microservice' });
    });
    // Connect MongoDB
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log('✅ Auth Service connected to MongoDB at:', MONGO_URI);
    }
    catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err);
    }
    // Connect RabbitMQ
    const eventPublisher = new RabbitMQPublisher_1.RabbitMQPublisher(RABBIT_URL);
    await eventPublisher.connect();
    // Instantiate Repositories & Security Adapters
    const userAuthRepo = new MongoUserAuthRepo_1.MongoUserAuthRepo();
    const refreshTokenRepo = new MongoRefreshTokenRepo_1.MongoRefreshTokenRepo();
    const revokedTokenRepo = new MongoRevokedTokenRepo_1.MongoRevokedTokenRepo();
    const hasher = new Argon2Hasher_1.Argon2Hasher();
    const tokenSigner = new RS256TokenSigner_1.RS256TokenSigner();
    // Instantiate Use Cases
    const registerUserUseCase = new RegisterUser_usecase_1.RegisterUserUseCase(userAuthRepo, refreshTokenRepo, hasher, eventPublisher, tokenSigner);
    const authenticateUseCase = new Authenticate_usecase_1.AuthenticateUseCase(userAuthRepo, refreshTokenRepo, hasher, tokenSigner);
    const refreshTokenUseCase = new RefreshToken_usecase_1.RefreshTokenUseCase(refreshTokenRepo, userAuthRepo, tokenSigner);
    const revokeTokenUseCase = new RevokeToken_usecase_1.RevokeTokenUseCase(revokedTokenRepo);
    const oauthLoginUseCase = new OAuthLogin_usecase_1.OAuthLoginUseCase(userAuthRepo, refreshTokenRepo, eventPublisher, tokenSigner);
    // Instantiate Controllers & Router
    const authController = new AuthController_1.AuthController(registerUserUseCase, authenticateUseCase, refreshTokenUseCase, revokeTokenUseCase, tokenSigner);
    const oauthController = new OAuthController_1.OAuthController(oauthLoginUseCase);
    const authRouter = (0, auth_routes_1.createAuthRouter)(authController, oauthController);
    app.use('/api/auth', authRouter);
    app.listen(PORT, () => {
        console.log(`🚀 Auth Microservice running on port ${PORT}`);
    });
}
bootstrap().catch((err) => {
    console.error('Fatal error during Auth Microservice bootstrap:', err);
    process.exit(1);
});
