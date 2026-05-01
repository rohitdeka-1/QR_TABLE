import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import User from "../models/User.js";
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

  const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  res.cookie("qr_restaurant_token", token, authCookieOptions());
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

async function logout(req, res) {
  res.clearCookie("qr_restaurant_token", { path: "/" });
  res.status(204).send();
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

export { ensureBootstrapAdmin, login, logout, seedAdmin };
