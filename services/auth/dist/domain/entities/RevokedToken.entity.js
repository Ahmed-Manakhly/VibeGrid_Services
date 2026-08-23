"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevokedToken = void 0;
class RevokedToken {
    props;
    constructor(props) {
        this.props = {
            ...props,
            revokedAt: props.revokedAt || new Date()
        };
    }
    static create(props) {
        return new RevokedToken(props);
    }
    get id() {
        return this.props.id;
    }
    get token() {
        return this.props.token;
    }
    get type() {
        return this.props.type;
    }
    get revokedAt() {
        return this.props.revokedAt || new Date();
    }
    get expiresAt() {
        return this.props.expiresAt;
    }
}
exports.RevokedToken = RevokedToken;
