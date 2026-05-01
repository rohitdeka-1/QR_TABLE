import express from 'express';
import { body } from 'express-validator';
import { login, logout, seedAdmin } from '../controllers/authController.js';
import loginLimiter from '../middlewares/loginLimiter.js';

const router = express.Router();

router.post(
	'/login',
	loginLimiter,
	[body('email').isEmail().withMessage('Valid email required'), body('password').isLength({ min: 6 })],
	login
);

router.post(
	'/seed-admin',
	[body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 })],
	seedAdmin
);

router.post('/logout', logout);

export default router;
