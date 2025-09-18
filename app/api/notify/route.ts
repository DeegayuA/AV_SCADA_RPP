import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

const RECIPIENT_SETTINGS_FILE = path.resolve(process.cwd(), 'config/recipient-settings.json');
const SMTP_SETTINGS_FILE = path.resolve(process.cwd(), 'config/smtp.config.json');

async function getRecipients() {
  try {
    const data = await fs.readFile(RECIPIENT_SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading recipient settings:', error);
    return { email: '', sms: '' };
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

export async function POST(request: Request) {
  const { rule, currentValue } = await request.json();
  const recipients = await getRecipients();
  const smtpConfig = await getSmtpConfig();

  if (!rule) {
    return NextResponse.json({ error: 'Missing notification rule data' }, { status: 400 });
  }

  const { name, severity, message, sendEmail, sendSms } = rule;

  if (sendEmail && recipients?.email && smtpConfig) {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);

      const mailOptions = {
        from: `"AV Dashboard" <${smtpConfig.auth.user}>`,
        to: recipients.email,
        subject: `[${severity.toUpperCase()}] Alert: ${name}`,
        html: `
          <h1>Alert: ${name}</h1>
          <p><strong>Severity:</strong> ${severity}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Current Value:</strong> ${currentValue}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent for rule:', name);
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't return an error response, as we want to continue to SMS if applicable
    }
  }

  if (sendSms && recipients?.sms) {
    const smsMessage = `[${severity.toUpperCase()}] Alert: ${name}. Value: ${currentValue}. Time: ${new Date().toLocaleTimeString()}`;
    console.log(`--- SIMULATING SMS ---`);
    console.log(`To: ${recipients.sms}`);
    console.log(`Message: ${smsMessage}`);
    console.log(`----------------------`);
  }

  return NextResponse.json({ message: 'Notification processed' });
}
