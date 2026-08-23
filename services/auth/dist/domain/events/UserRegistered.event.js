"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRegisteredEvent = void 0;
class UserRegisteredEvent {
    payload;
    eventName = 'user.registered';
    version = 1;
    constructor(payload) {
        this.payload = payload;
    }
}
exports.UserRegisteredEvent = UserRegisteredEvent;
