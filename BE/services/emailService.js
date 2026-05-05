import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and compile the Handlebars template once at startup
const templateSource = readFileSync(
  path.join(__dirname, '../templates/otp.hbs'),
  'utf8'
);
const otpTemplate = Handlebars.compile(templateSource);

// Create reusable transporter using Google App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GOOGLE_APP_GMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

/**
 * Send an OTP email using the Handlebars template.
 * @param {object} opts
 * @param {string} opts.to        - Recipient email
 * @param {string} opts.name      - Recipient name (or email if unknown)
 * @param {string} opts.otp       - 6-digit OTP string
 * @param {'register'|'change-password'} opts.purpose
 */
export async function sendOtpEmail({ to, name, otp, purpose }) {
  const purposeLabel = purpose === 'register' ? 'Account Registration' : 'Password Change';
  const actionText  = purpose === 'register'
    ? 'verify your email and complete registration'
    : 'change your account password';

  const html = otpTemplate({
    name: name || to,
    otp,
    purposeLabel,
    actionText,
    year: new Date().getFullYear(),
  });

  await transporter.sendMail({
    from: `"QR Restaurant" <${process.env.GOOGLE_APP_GMAIL}>`,
    to,
    subject: `${otp} is your QR Restaurant verification code`,
    html,
  });
}
