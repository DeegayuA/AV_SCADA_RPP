import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { notificationConfig } from '@/config/notification.config';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.resolve(process.cwd(), 'config/recipient-settings.json');

async function getRecipients() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading recipient settings:', error);
    return { email: '', sms: '' };
  }
}

export async function POST(request: Request) {
  const { rule, currentValue } = await request.json();
  const recipients = await getRecipients();

  if (!rule) {
    return NextResponse.json({ error: 'Missing notification rule data' }, { status: 400 });
  }

  const { name, severity, message, sendEmail, sendSms } = rule;

  if (sendEmail && recipients?.email) {
    try {
      const transporter = nodemailer.createTransport({
        host: notificationConfig.smtp.host,
        port: notificationConfig.smtp.port,
        secure: notificationConfig.smtp.secure,
        auth: {
          user: notificationConfig.smtp.auth.user,
          pass: notificationConfig.smtp.auth.pass,
        },
      });

      const mailOptions = {
        from: `"AV Dashboard" <${notificationConfig.smtp.auth.user}>`,
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
