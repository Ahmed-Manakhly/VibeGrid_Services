"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQPublisher = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
class RabbitMQPublisher {
    rabbitUrl;
    channel = null;
    exchange = 'domain.events';
    constructor(rabbitUrl) {
        this.rabbitUrl = rabbitUrl;
    }
    async connect() {
        try {
            const conn = await amqplib_1.default.connect(this.rabbitUrl);
            this.channel = await conn.createChannel();
            await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
            console.log('✅ Auth Service connected to RabbitMQ Exchange:', this.exchange);
        }
        catch (err) {
            console.error('❌ Failed to connect to RabbitMQ in Auth Service:', err);
        }
    }
    async publish(eventName, payload) {
        if (!this.channel) {
            console.warn('⚠️ RabbitMQ channel not initialized, skipping publish:', eventName);
            return;
        }
        const routingKey = eventName;
        const content = Buffer.from(JSON.stringify(payload));
        this.channel.publish(this.exchange, routingKey, content, { persistent: true });
        console.log(`📡 Published [${routingKey}] to exchange [${this.exchange}]`);
    }
}
exports.RabbitMQPublisher = RabbitMQPublisher;
