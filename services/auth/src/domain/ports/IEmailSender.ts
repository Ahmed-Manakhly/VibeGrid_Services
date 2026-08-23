export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailSender {
  sendEmail(payload: SendEmailPayload): Promise<void>;
}
