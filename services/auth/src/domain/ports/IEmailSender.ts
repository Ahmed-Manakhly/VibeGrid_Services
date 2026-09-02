export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailSender {
  sendEmail(payload: SendEmailPayload): Promise<void>;
}
