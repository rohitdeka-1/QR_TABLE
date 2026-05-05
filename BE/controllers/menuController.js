import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import { validationResult } from 'express-validator';
import { uploadToCloudinary } from '../utils/cloudinary.js';

function getRestaurantId(req) {
  return req.user?.restaurantId || req.restaurantId || null;
}

async function uploadImageIfPresent(req, folder) {
  if (!req.file) return null;
  return uploadToCloudinary(req.file.buffer, folder);
}

async function listMenu(req, res) {
  const filter = { available: true };
  const restaurantId = getRestaurantId(req) || req.query.restaurantId;
  if (restaurantId) filter.restaurantId = restaurantId;
  if (req.query.categoryId) filter.category = req.query.categoryId;
  const items = await MenuItem.find(filter).populate('category').lean();
  res.json(items);
}

async function listMenuAdmin(req, res) {
  const restaurantId = getRestaurantId(req);
  // If admin has a restaurantId, include items that belong to that restaurant
  // and also include legacy items that have no restaurantId set.
  let filter = {};
  if (restaurantId) {
    filter = { $or: [ { restaurantId }, { restaurantId: { $exists: false } } ] };
  }
  const items = await MenuItem.find(filter).populate('category').sort({ createdAt: -1 }).lean();
  res.json(items);
}

async function listCategories(req, res) {
  const restaurantId = getRestaurantId(req) || req.query.restaurantId;
  const filter = restaurantId ? { restaurantId } : {};
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  res.json(categories);
}

async function uploadCategoryImage(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  
  // Validate file type
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }
  
  try {
    if (req.file.size > 1 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size must be less than 1 MB' });
    }
    const imageUrl = await uploadToCloudinary(req.file.buffer, 'categories');
    const updated = await Category.findByIdAndUpdate(id, { image: imageUrl }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Category not found' });
    res.json(updated);
  } catch (err) {
    console.error('Category image upload error:', err);
    const message = err.message?.includes('File too large') 
      ? 'File size must be less than 1 MB' 
      : err.message || 'Failed to upload category image';
    res.status(400).json({ message });
  }
}

async function uploadMenuItemImage(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  
  // Validate file type
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }
  
  try {
    if (req.file.size > 1 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size must be less than 1 MB' });
    }
    const imageUrl = await uploadToCloudinary(req.file.buffer, 'menu-items');
    const updated = await MenuItem.findByIdAndUpdate(id, { image: imageUrl }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Menu item not found' });
    res.json(updated);
  } catch (err) {
    console.error('Menu item image upload error:', err);
    const message = err.message?.includes('File too large')
      ? 'File size must be less than 1 MB'
      : err.message || 'Failed to upload menu item image';
    res.status(err.status || 400).json({ message });
  }
}

async function createCategory(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description } = req.body;
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return res.status(400).json({ message: 'Missing restaurant context' });
  try {
    const image = await uploadImageIfPresent(req, 'categories');
    const cat = await Category.create({ restaurantId, name, description, image: image || undefined });
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
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return res.status(400).json({ message: 'Missing restaurant context' });

  const payload = {
    restaurantId,
    name: req.body.name,
    description: req.body.description,
    price: Number(req.body.price),
    available: req.body.available === undefined ? true : req.body.available === 'true' || req.body.available === true,
    category: req.body.category || undefined,
  };

  const image = await uploadImageIfPresent(req, 'menu-items');
  if (image) payload.image = image;

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
  const restaurantId = getRestaurantId(req);
  const update = { ...req.body };
  if (req.file) {
    update.image = await uploadImageIfPresent(req, 'menu-items');
  }
  if (restaurantId) update.restaurantId = restaurantId;
  const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  res.json(item);
}

async function deleteMenuItem(req, res) {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.status(204).send();
}

async function deleteCategory(req, res) {
  const { id } = req.params;
  try {
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: err.message || 'Failed to delete category' });
  }
}

async function updateCategory(req, res) {
  const { id } = req.params;
  const restaurantId = getRestaurantId(req);
  const update = { ...req.body };
  if (req.file) {
    update.image = await uploadImageIfPresent(req, 'categories');
  }
  if (restaurantId) update.restaurantId = restaurantId;
  try {
    const cat = await Category.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: `Category name already exists` });
    }
    console.error('Update category error:', err);
    res.status(500).json({ message: err.message || 'Failed to update category' });
  }
}

export {
  listMenu,
  listMenuAdmin,
  listCategories,
  uploadCategoryImage,
  uploadMenuItemImage,
  createCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  deleteCategory,
  updateCategory,
};
