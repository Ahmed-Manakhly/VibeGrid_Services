import nodemailer from 'nodemailer';
import { IEmailSender, SendEmailPayload } from '../../domain/ports/IEmailSender';

export class NodemailerEmailSender implements IEmailSender {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });
  }

  public async sendEmail(payload: SendEmailPayload): Promise<void> {
    const from = process.env.EMAIL_FROM || '"VibeGrid Support" <noreply@vibegrid.com>';
    await this.transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });
  }
}
