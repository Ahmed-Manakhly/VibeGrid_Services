export interface EmailVerificationTemplateInput {
  name?: string;
  otp: string;
  expiresInMinutes: number;
}

export class EmailVerificationTemplate {
  public static render(input: EmailVerificationTemplateInput): { subject: string; html: string; text: string } {
    const nameStr = input.name ? input.name : 'User';
    const subject = 'Verify Your VibeGrid Account Email';
    const text = `Hello ${nameStr},\n\nThank you for registering on VibeGrid. Your email verification OTP code is: ${input.otp}\n\nThis code will expire in ${input.expiresInMinutes} minutes.`;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
      .header { font-size: 22px; font-weight: bold; color: #1e293b; margin-bottom: 16px; }
      .otp-box { background: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2563eb; text-align: center; margin: 20px 0; }
      .footer { font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">VibeGrid Email Verification</div>
      <p>Hello <strong>${nameStr}</strong>,</p>
      <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address:</p>
      <div class="otp-box">${input.otp}</div>
      <p>This verification code will expire in <strong>${input.expiresInMinutes} minutes</strong>.</p>
      <div class="footer">&copy; ${new Date().getFullYear()} VibeGrid. All rights reserved.</div>
    </div>
  </body>
</html>
    `.trim();

    return { subject, html, text };
  }
}
