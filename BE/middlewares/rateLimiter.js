import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMinutes * 60 * 1000,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

export default limiter;
