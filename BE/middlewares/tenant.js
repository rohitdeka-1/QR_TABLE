// Middleware to enforce and normalize tenant (restaurant) context
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';

export async function tenantFromParams(req, res, next) {
  try {
    const paramId = req.params.restaurantId || req.body.restaurantId || null;
    // attach if present
    if (paramId) req.restaurantId = paramId;
    // if JWT present, prefer its restaurantId
    const auth = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.qr_restaurant_token;
    if (auth) {
      try {
        const payload = jwt.verify(auth, config.jwtSecret);
        req.user = req.user || {};
        req.user.id = payload.id;
        req.user.roles = payload.roles || (payload.role ? [payload.role] : []);
        req.user.restaurantId = payload.restaurantId || null;
        if (!req.restaurantId && req.user.restaurantId) req.restaurantId = req.user.restaurantId;
      } catch (e) {
        // ignore invalid token; leave as unauthenticated
      }
    }
    // final enforcement: if route included a restaurantId and user is present, ensure matching
    if (req.user?.restaurantId && req.restaurantId && String(req.user.restaurantId) !== String(req.restaurantId)) {
      return res.status(403).json({ message: 'Forbidden: tenant mismatch' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (roles.includes(role) || roles.includes('admin')) return next();
    return res.status(403).json({ message: 'Forbidden' });
  };
}
