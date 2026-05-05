import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireSecret(name, value, minLength = 32) {
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be set and at least ${minLength} characters long`);
  }
  return value;
}

const config = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/qr_restaurant',
  jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  rateLimitWindowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 1),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 200),
  queueResetHour: Number(process.env.QUEUE_RESET_HOUR || 0),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:3000,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminSetupToken: process.env.ADMIN_SETUP_TOKEN || null,
  bootstrapAdminEmail: process.env.ADMIN_EMAIL || 'admin@test.com',
  bootstrapAdminPassword: process.env.ADMIN_PASSWORD || 'AdminPass123',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
};

export default config;
