"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = createAuthRouter;
const express_1 = require("express");
function createAuthRouter(authController, oauthController) {
    const router = (0, express_1.Router)();
    router.post('/register', authController.register);
    router.post('/login', authController.login);
    router.post('/refresh', authController.refresh);
    router.post('/logout', authController.logout);
    router.get('/jwks.json', authController.getJwks);
    router.get('/oauth/google', oauthController.googleLogin);
    router.get('/oauth/google/callback', oauthController.googleCallback);
    router.get('/oauth/github', oauthController.githubLogin);
    router.get('/oauth/github/callback', oauthController.githubCallback);
    return router;
}
