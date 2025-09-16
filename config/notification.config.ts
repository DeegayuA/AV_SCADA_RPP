export const notificationConfig = {
  email: {
    enabled: true,
    recipient: 'user@example.com',
  },
  sms: {
    enabled: true,
    recipient: '+1234567890',
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password', // Use an app-specific password for services like Gmail
    },
  },
};
