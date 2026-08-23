"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = void 0;
class RefreshToken {
    props;
    constructor(props) {
        this.props = {
            ...props,
            isRevoked: props.isRevoked ?? false,
            createdAt: props.createdAt || new Date()
        };
    }
    static create(props) {
        return new RefreshToken(props);
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get tokenHash() {
        return this.props.tokenHash;
    }
    get familyId() {
        return this.props.familyId;
    }
    get isRevoked() {
        return this.props.isRevoked;
    }
    get expiresAt() {
        return this.props.expiresAt;
    }
    get createdAt() {
        return this.props.createdAt || new Date();
    }
    revoke() {
        this.props.isRevoked = true;
    }
}
exports.RefreshToken = RefreshToken;
