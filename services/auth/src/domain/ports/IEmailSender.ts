export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailVerificationPayload {
  to: string;
  name?: string;
  otp: string;
  expiresInMinutes: number;
}

export interface IEmailSender {
  sendEmail(payload: SendEmailPayload): Promise<void>;
  sendEmailVerification(payload: SendEmailVerificationPayload): Promise<void>;
}
