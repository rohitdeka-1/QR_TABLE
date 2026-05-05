import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { validationResult } from "express-validator";
import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import config from "../config/index.js";

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  // Basic account lockout check
  if (user.lockUntil && user.lockUntil > Date.now()) {
    return res.status(423).json({ message: "Account locked. Try later." });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
      user.loginAttempts = 0;
    }
    await user.save();
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // reset attempts on success
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  const payload = { id: user._id, roles: user.roles || (user.role ? [user.role] : []), restaurantId: user.restaurantId || null };
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  res.cookie("qr_restaurant_token", token, authCookieOptions());
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, roles: user.roles, restaurantId: user.restaurantId },
  });
}

async function logout(req, res) {
  res.clearCookie("qr_restaurant_token", { path: "/" });
  res.status(204).send();
}

async function me(req, res) {
  // `authenticate` middleware should populate `req.user`
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  // return sanitized user object
  const u = req.user;
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role, roles: u.roles, restaurantId: u.restaurantId });
}

// Register a new restaurant and create the initial admin user
async function registerRestaurant(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { restaurantName, ownerName, ownerEmail } = req.body;
  if (!restaurantName || !ownerName || !ownerEmail) return res.status(400).json({ message: 'Missing required fields' });

  // ensure email not already used
  const existingUser = await User.findOne({ email: ownerEmail });
  if (existingUser) return res.status(400).json({ message: 'Email already in use' });

  // create restaurant (slug naive)
  const baseSlug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let slug = baseSlug || `r-${crypto.randomBytes(3).toString('hex')}`;
  // ensure unique slug
  let suffix = 0;
  while (await Restaurant.findOne({ slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const restaurant = await Restaurant.create({ name: restaurantName, slug });

  // generate random password for admin
  const plainPassword = crypto.randomBytes(6).toString('base64').replace(/\+/g, 'A').replace(/\//g, 'B').slice(0, 10);
  const hashed = await bcrypt.hash(plainPassword, config.bcryptSaltRounds || 12);

  const user = await User.create({
    name: ownerName,
    email: ownerEmail,
    password: hashed,
    role: 'admin',
    roles: ['admin'],
    restaurantId: restaurant._id,
  });

  // In production, send the password via email. For MVP return it in response.
  res.status(201).json({ restaurant: { id: restaurant._id, name: restaurant.name, slug: restaurant.slug }, admin: { id: user._id, email: user.email, password: plainPassword } });
}

// Invite staff (admin-only) — generates temporary password and returns it
async function inviteStaff(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // requires authentication and admin role checked in route
  const { name, email, role } = req.body; // role is logical like 'kitchen' or 'staff'
  const restaurantId = req.params.restaurantId || req.user?.restaurantId || req.body.restaurantId;
  if (!restaurantId) return res.status(400).json({ message: 'Missing restaurant context' });
  if (!name || !email) return res.status(400).json({ message: 'Missing required fields' });

  const allowedRoles = ['kitchen', 'staff', 'cashier'];
  const assigned = allowedRoles.includes(role) ? role : 'staff';

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already in use' });

  const plainPassword = crypto.randomBytes(6).toString('base64').replace(/\+/g, 'A').replace(/\//g, 'B').slice(0, 10);
  const hashed = await bcrypt.hash(plainPassword, config.bcryptSaltRounds || 12);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: 'staff',
    roles: [assigned],
    restaurantId,
  });

  // In production, send invite via email. Return password in response for MVP.
  res.status(201).json({ id: user._id, email: user.email, password: plainPassword, roles: user.roles });
}

async function seedAdmin(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: "User exists" });

  // Protect admin seeding: require an explicit setup token
  const provided = req.headers["x-admin-setup-token"];
  if (
    !config.adminSetupToken ||
    !provided ||
    provided !== config.adminSetupToken
  ) {
    return res.status(403).json({ message: "Admin setup token required" });
  }

  const hashed = await bcrypt.hash(password, config.bcryptSaltRounds || 12);
  const user = await User.create({
    name,
    email,
    password: hashed,
    role: "admin",
  });
  res.status(201).json({ id: user._id, name: user.name, email: user.email });
}

async function ensureBootstrapAdmin() {
  const email = String(config.bootstrapAdminEmail || '').trim().toLowerCase();
  const password = String(config.bootstrapAdminPassword || '').trim();
  if (!email || !password) return null;

  const hashed = await bcrypt.hash(password, config.bcryptSaltRounds || 12);
  const user = await User.findOneAndUpdate(
    { email },
    {
      name: 'Admin',
      email,
      password: hashed,
      role: 'admin',
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return user;
}

export { ensureBootstrapAdmin, login, logout, seedAdmin, registerRestaurant, inviteStaff, me };
