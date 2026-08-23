"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAuth = void 0;
class UserAuth {
    props;
    constructor(props) {
        this.props = {
            ...props,
            provider: props.provider || 'local',
            role: props.role || 'USER',
            createdAt: props.createdAt || new Date(),
            updatedAt: props.updatedAt || new Date()
        };
    }
    static create(props) {
        return new UserAuth(props);
    }
    get id() {
        return this.props.id;
    }
    get email() {
        return this.props.email;
    }
    get passwordHash() {
        return this.props.passwordHash;
    }
    get name() {
        return this.props.name;
    }
    get provider() {
        return this.props.provider || 'local';
    }
    get providerId() {
        return this.props.providerId;
    }
    get role() {
        return this.props.role || 'USER';
    }
    get createdAt() {
        return this.props.createdAt || new Date();
    }
    get updatedAt() {
        return this.props.updatedAt || new Date();
    }
}
exports.UserAuth = UserAuth;
