import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const loginLimiter = rateLimit({
  windowMs: config.rateLimitWindowMinutes * 60 * 1000,
  max: Math.max(5, Math.floor(config.rateLimitMax / 6)), // tighter for login
  message: { message: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export default loginLimiter;
