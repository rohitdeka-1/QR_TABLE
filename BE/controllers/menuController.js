import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import { validationResult } from 'express-validator';

async function listMenu(req, res) {
  const items = await MenuItem.find({ available: true }).populate('category').lean();
  res.json(items);
}

async function listMenuAdmin(req, res) {
  const items = await MenuItem.find({}).populate('category').sort({ createdAt: -1 }).lean();
  res.json(items);
}

async function listCategories(req, res) {
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  res.json(categories);
}

async function createCategory(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description } = req.body;
  try {
    const cat = await Category.create({ name, description });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: `Category '${name}' already exists` });
    }
    throw err;
  }
}

async function createMenuItem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const payload = req.body;
  try {
    const item = await MenuItem.create(payload);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    throw err;
  }
}

async function updateMenuItem(req, res) {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
}

async function deleteMenuItem(req, res) {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.status(204).send();
}

export {
  listMenu,
  listMenuAdmin,
  listCategories,
  createCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
