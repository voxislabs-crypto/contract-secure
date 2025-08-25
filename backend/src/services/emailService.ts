import nodemailer from 'nodemailer';
import config from '../config/config.js';
import { logger } from '../utils/logger.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private devMode: boolean;

  constructor() {
    this.devMode = config.email.devAcceptCode || !config.email.smtpHost;
    
    if (!this.devMode) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass,
        },
      });
      
      // Verify connection configuration
      this.transporter.verify()
        .then(() => logger.info('SMTP connection verified'))
        .catch(error => logger.error('SMTP connection error:', error));
    } else {
      logger.warn('Running in development mode. Emails will be logged to console instead of being sent.');
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    const mailOptions = {
      from: `"ContractSecure" <${config.email.smtpFrom}>`,
      to,
      subject,
      text,
      html: html || text,
    };

    if (this.devMode) {
      logger.info('Development mode: Email not sent. Would have sent:');
      logger.info(JSON.stringify(mailOptions, null, 2));
      return { message: 'Email logged (development mode)', accepted: [to] };
    }

    if (!this.transporter) {
      throw new Error('Email service not properly initialized');
    }

    return this.transporter.sendMail(mailOptions);
  }

  // Example email methods
  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    return this.sendEmail(
      email,
      'Verify Your Email',
      `Please verify your email by clicking the following link: ${verificationUrl}`,
      `<p>Please verify your email by clicking the following link: <a href="${verificationUrl}">Verify Email</a></p>`
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    return this.sendEmail(
      email,
      'Password Reset Request',
      `To reset your password, please click the following link: ${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
      `<p>To reset your password, please click the following link: <a href="${resetUrl}">Reset Password</a></p>
       <p>If you didn't request this, please ignore this email.</p>`
    );
  }
}

export const emailService = new EmailService();
