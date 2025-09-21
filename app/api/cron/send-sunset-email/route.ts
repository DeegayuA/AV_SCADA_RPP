import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { logActivity } from '@/lib/activityLog';

const RECIPIENT_SETTINGS_FILE = path.resolve(process.cwd(), 'config/recipient-settings.json');
const SMTP_SETTINGS_FILE = path.resolve(process.cwd(), 'config/smtp.config.json');

async function getRecipients() {
  try {
    const data = await fs.readFile(RECIPIENT_SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading recipient settings:', error);
    return null;
  }
}

async function getSmtpConfig() {
    try {
        const data = await fs.readFile(SMTP_SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading SMTP settings:', error);
        return null;
    }
}

async function sendEmailWithRetries(mailOptions: any, smtpConfig: any) {
  const MAX_RETRIES = 3;
  const RETRY_INTERVAL_MS = 60 * 1000; // 1 minute
  const LONG_RETRY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);
      await transporter.sendMail(mailOptions);
      logActivity('SUNSET_EMAIL_SUCCESS', { to: mailOptions.to, attempt: attempts + 1 });
      return { success: true };
    } catch (error) {
      attempts++;
      logActivity('SUNSET_EMAIL_RETRY', { to: mailOptions.to, attempt: attempts, error: (error as Error).message }, 'error');
      if (attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
      }
    }
  }

  // If all retries fail, try again after 1 hour
  try {
    await new Promise(resolve => setTimeout(resolve, LONG_RETRY_INTERVAL_MS));
    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.sendMail(mailOptions);
    logActivity('SUNSET_EMAIL_SUCCESS', { to: mailOptions.to, attempt: 'long_retry' });
    return { success: true };
  } catch (error) {
    logActivity('SUNSET_EMAIL_FAILURE', { to: mailOptions.to, error: (error as Error).message }, 'error');
    return { success: false, error: 'Failed to send email after all retries.' };
  }
}

export async function POST() {
  logActivity('SUNSET_EMAIL_JOB_STARTED', {});

  const recipients = await getRecipients();
  const smtpConfig = await getSmtpConfig();

  if (!recipients || !recipients.email) {
    logActivity('SUNSET_EMAIL_ERROR', { error: 'No recipients configured' }, 'error');
    return NextResponse.json({ error: 'No recipients configured' }, { status: 400 });
  }

  if (!smtpConfig || !smtpConfig.host) {
    logActivity('SUNSET_EMAIL_ERROR', { error: 'SMTP not configured' }, 'error');
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 400 });
  }

  const sunsetEmailConfigFile = path.resolve(process.cwd(), 'config/sunset-email.config.json');
  const sunsetEmailConfigData = await fs.readFile(sunsetEmailConfigFile, 'utf-8');
  const sunsetEmailConfig = JSON.parse(sunsetEmailConfigData);

  if (!sunsetEmailConfig.enabled) {
    logActivity('SUNSET_EMAIL_JOB_DISABLED', {});
    return NextResponse.json({ message: 'Sunset email is disabled' });
  }

  // Placeholder for data fetching and calculations
  const generationValue = Math.round(Math.random() * 1000);
  const earnings = (generationValue * sunsetEmailConfig.rate).toFixed(2);

  let message = sunsetEmailConfig.message;
  message = message.replace(/{{generationValue}}/g, generationValue.toString());
  message = message.replace(/{{earnings}}/g, earnings);
  message = message.replace(/{{currency}}/g, sunsetEmailConfig.currency);

  const mailOptions = {
    from: `"AV Dashboard" <${smtpConfig.auth.user}>`,
    to: recipients.email,
    subject: sunsetEmailConfig.subject,
    html: message,
  };

  const result = await sendEmailWithRetries(mailOptions, smtpConfig);

  if (result.success) {
    return NextResponse.json({ message: 'Email sent successfully' });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}
