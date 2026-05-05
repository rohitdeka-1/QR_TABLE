import express from 'express';
import { body } from 'express-validator';
import { login, logout, seedAdmin, registerRestaurant, inviteStaff } from '../controllers/authController.js';
import { me } from '../controllers/authController.js';
import loginLimiter from '../middlewares/loginLimiter.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.post(
	'/login',
	loginLimiter,
	[body('email').isEmail().withMessage('Valid email required'), body('password').isLength({ min: 6 })],
	login
);

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

router.post('/logout', logout);

router.get('/me', authenticate, me);

export default router;
