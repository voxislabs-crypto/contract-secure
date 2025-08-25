import nodemailer from 'nodemailer';
import { CONFIG } from '../config/config.js';

let transporter: nodemailer.Transporter | null = null;

export function getTransport(): nodemailer.Transporter {
  if (transporter) return transporter;
  
  if (CONFIG.SMTP_HOST && CONFIG.SMTP_USER && CONFIG.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: CONFIG.SMTP_HOST,
      port: CONFIG.SMTP_PORT,
      secure: CONFIG.SMTP_SECURE,
      auth: { 
        user: CONFIG.SMTP_USER, 
        pass: CONFIG.SMTP_PASS 
      },
    });
  } else {
    // Dev mode: log emails to console
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }
  
  return transporter;
}

export async function sendEmail(
  to: string, 
  subject: string, 
  text: string, 
  html?: string
): Promise<nodemailer.SentMessageInfo> {
  const t = getTransport();
  const info = await t.sendMail({ 
    from: CONFIG.SMTP_FROM, 
    to, 
    subject, 
    text, 
    html 
  });
  
  // Log email in development
  const transport = t.transporter as { name?: string } | undefined;
  if (transport?.name === 'JSONTransport') {
    // eslint-disable-next-line no-console
    console.log('[DEV EMAIL]', { to, subject, text, html });
  }
  
  return info;
}

export async function sendInviteEmail(
  to: string, 
  contractTitle: string, 
  inviteLink: string
): Promise<nodemailer.SentMessageInfo> {
  const subject = `You've been invited to sign: ${contractTitle}`;
  const text = `Please sign the document at: ${inviteLink}`;
  const html = `
    <p>You've been invited to sign the document: <strong>${contractTitle}</strong></p>
    <p>Please click the link below to review and sign the document:</p>
    <p><a href="${inviteLink}">${inviteLink}</a></p>
    <p>This link will expire in 7 days.</p>
  `;
  
  return sendEmail(to, subject, text, html);
}

export async function sendOtpEmail(
  to: string, 
  otp: string
): Promise<nodemailer.SentMessageInfo> {
  const subject = 'Your ContractSecure verification code';
  const text = `Your verification code is: ${otp} (valid for 10 minutes)`;
  const html = `
    <p>Your verification code is: <strong>${otp}</strong></p>
    <p>This code is valid for 10 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
  `;
  
  return sendEmail(to, subject, text, html);
}
