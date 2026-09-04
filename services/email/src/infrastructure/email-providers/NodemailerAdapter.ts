import nodemailer from 'nodemailer';
import { IEmailProvider } from '../../domain/ports/IEmailProvider';
import { EmailMessage } from '../../domain/value-objects/EmailMessage.vo';

export interface NodemailerConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
}

export class NodemailerAdapter implements IEmailProvider {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;

  constructor(config: NodemailerConfig) {
    this.defaultFrom = config.from || 'VibeGrid System <no-reply@vibegrid.com>';
    
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: message.from || this.defaultFrom,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      console.log(`[NodemailerAdapter] Email sent to ${message.to} | Subject: ${message.subject}`);
    } catch (err: any) {
      console.error(`[NodemailerAdapter] Error sending email to ${message.to}:`, err?.message || err);
      throw new Error(`Email provider delivery failed: ${err?.message || err}`);
    }
  }
}
