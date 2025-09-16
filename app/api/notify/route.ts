import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { notificationConfig } from '@/config/notification.config';

export async function POST(request: Request) {
  const { rule, currentValue } = await request.json();

  if (!rule) {
    return NextResponse.json({ error: 'Missing notification rule data' }, { status: 400 });
  }

  const { name, severity, message, sendEmail, sendSms } = rule;

  if (sendEmail && notificationConfig.email.enabled) {
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
        to: notificationConfig.email.recipient,
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

  if (sendSms && notificationConfig.sms.enabled) {
    const smsMessage = `[${severity.toUpperCase()}] Alert: ${name}. Value: ${currentValue}. Time: ${new Date().toLocaleTimeString()}`;
    console.log(`--- SIMULATING SMS ---`);
    console.log(`To: ${notificationConfig.sms.recipient}`);
    console.log(`Message: ${smsMessage}`);
    console.log(`----------------------`);
  }

  return NextResponse.json({ message: 'Notification processed' });
}
