export interface SendEmailVerificationInput {
  email: string;
}

export interface IEmailVerificationService {
  execute(input: SendEmailVerificationInput): Promise<{ message: string }>;
}
