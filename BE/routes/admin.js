import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { tenantFromParams } from '../middlewares/tenant.js';
import * as orderController from '../controllers/orderController.js';
import * as menuController from '../controllers/menuController.js';
import * as tableController from '../controllers/tableController.js';
import * as restaurantController from '../controllers/restaurantController.js';
import { getAnalytics } from '../controllers/analyticsController.js';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';

// Use memory storage for uploading to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Strict rate limiter for upload endpoints — prevents memory exhaustion (DoS)
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,                  // max 10 uploads per IP per window
  message: { message: 'Too many uploads, please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use((req, res, next) => authorize('admin')(req, res, next));
router.use(tenantFromParams);

// Orders
router.get('/orders', orderController.listOrders);
router.get('/orders/:id', orderController.getBillData);
router.patch('/orders/:id/status', orderController.updateStatus);
router.patch('/orders/:id/payment', orderController.updatePaymentDetails);
router.post('/orders/:id/pay', orderController.markPaid);

// Menu management
router.get('/menu', menuController.listMenuAdmin);
router.post('/menu', uploadLimiter, upload.single('image'), [body('name').notEmpty(), body('price').isNumeric()], menuController.createMenuItem);
router.patch('/menu/:id', uploadLimiter, upload.single('image'), menuController.updateMenuItem);
router.post('/menu/:id/image', uploadLimiter, upload.single('image'), menuController.uploadMenuItemImage);
router.delete('/menu/:id', menuController.deleteMenuItem);

// Category management
router.get('/categories', menuController.listCategories);
router.post('/categories', uploadLimiter, upload.single('image'), [body('name').notEmpty()], menuController.createCategory);
router.patch('/categories/:id', uploadLimiter, upload.single('image'), menuController.updateCategory);
router.post('/categories/:id/image', uploadLimiter, upload.single('image'), menuController.uploadCategoryImage);
router.delete('/categories/:id', menuController.deleteCategory);

// Tables
router.get('/tables', tableController.listTables);
router.post('/tables', tableController.createTable);
router.patch('/tables/:id', tableController.updateTable);
router.delete('/tables/:id', tableController.deleteTable);

// Analytics
router.get('/analytics', getAnalytics);

// Restaurant Info
router.get('/restaurant', restaurantController.getRestaurantInfo);
router.patch('/restaurant', restaurantController.updateRestaurantInfo);
router.post('/restaurant/cover', uploadLimiter, upload.single('image'), restaurantController.uploadCoverImage);

export default router;
