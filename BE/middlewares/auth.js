import jwt from "jsonwebtoken";
import config from "../config/index.js";
import User from "../models/User.js";

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rest.join('=') || '');
    return cookies;
  }, {});
}

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  const cookieToken = parseCookies(req.headers.cookie || '')['qr_restaurant_token'];
  const token = auth && auth.startsWith('Bearer ') ? auth.split(' ')[1] : cookieToken;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function authorize(roles = []) {
  if (typeof roles === "string") roles = [roles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (roles.length) {
      const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
      const allowed = roles.some((r) => userRoles.includes(r) || userRoles.includes('admin'));
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

export { authenticate, authorize };
