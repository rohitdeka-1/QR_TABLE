import express from 'express';
import { body } from 'express-validator';
import { login, logout, seedAdmin, registerRestaurant, inviteStaff, me, sendOtp, verifyOtp, changePassword } from '../controllers/authController.js';
import loginLimiter from '../middlewares/loginLimiter.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Stricter rate limit for OTP endpoints (prevent abuse, not normal usage)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 OTP requests per IP per window
  message: { message: 'Too many OTP requests, please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().withMessage('Valid email required'), body('password').isLength({ min: 6 })],
  login
);

// OTP: send & verify
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', otpLimiter, verifyOtp);

// Public registration endpoint to create a restaurant and initial admin
router.post(
  '/register',
  [body('restaurantName').notEmpty(), body('ownerName').notEmpty(), body('ownerEmail').isEmail()],
  registerRestaurant
);

router.post(
  '/seed-admin',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 })],
  seedAdmin
);

// Invite staff (admin only) — returns temporary password for MVP
router.post('/:restaurantId/invite', authenticate, authorize('admin'), [body('name').notEmpty(), body('email').isEmail()], inviteStaff);

// Change password (requires auth + prior OTP verification)
router.post('/change-password', authenticate, changePassword);

router.post('/logout', logout);

router.get('/me', authenticate, me);

export default router;

