import nodemailer from 'nodemailer';
import { IEmailSender, SendEmailPayload, SendEmailVerificationPayload } from '../../domain/ports/IEmailSender';
import { EmailVerificationTemplate } from './templates/EmailVerificationTemplate';

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

export class NodemailerEmailSender implements IEmailSender {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(config?: SmtpConfig) {
    this.from = config?.from || '"VibeGrid Support" <noreply@vibegrid.com>';
    this.transporter = nodemailer.createTransport({
      host: config?.host || 'smtp.mailtrap.io',
      port: config?.port || 2525,
      connectionTimeout: 3000,
      socketTimeout: 3000,
      auth: {
        user: config?.user || '',
        pass: config?.pass || ''
      }
    });
  }

  public async sendEmail(payload: SendEmailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });
  }

  public async sendEmailVerification(payload: SendEmailVerificationPayload): Promise<void> {
    const { subject, html, text } = EmailVerificationTemplate.render({
      name: payload.name,
      otp: payload.otp,
      expiresInMinutes: payload.expiresInMinutes
    });

    await this.sendEmail({
      to: payload.to,
      subject,
      html,
      text
    });
  }
}
