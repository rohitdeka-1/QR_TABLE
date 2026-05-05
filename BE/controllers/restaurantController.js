import Restaurant from '../models/Restaurant.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

async function getRestaurantInfo(req, res) {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(restaurant);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function updateRestaurantInfo(req, res) {
  try {
    const { address, phone, gstin, latitude, longitude } = req.body;
    
    const updates = {};
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (gstin !== undefined) updates.gstin = gstin;
    if (latitude !== undefined || longitude !== undefined) {
      updates.location = {
        latitude: latitude || 0,
        longitude: longitude || 0,
      };
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      updates,
      { new: true, runValidators: true }
    );

    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(restaurant);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function uploadCoverImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size must be less than 2 MB' });
    }
    
    // We assume req.restaurantId is populated from the auth middleware,
    // OR we might want this to be accessible by the restaurant ID in the params if called from the public customer page?
    // The user says "In the menu page write an api to change and save the cover image"
    // The public menu page might not have the JWT token.
    // If it doesn't, we need a public route, or we require them to log in.
    // Actually, allowing anyone to change the cover image on the public page is insecure.
    // Let's assume there's a token if they are an admin, OR we can pass a special query param.
    // Wait! Let's check `routes/admin.js` to see if we can just put it there. Yes.
    const restaurantId = req.user?.restaurantId || req.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const imageUrl = await uploadToCloudinary(req.file.buffer, 'restaurant-covers');
    const updated = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { coverImage: imageUrl },
      { new: true }
    );
    
    if (!updated) return res.status(404).json({ message: 'Restaurant not found' });
    res.json({ coverImage: updated.coverImage });
  } catch (e) {
    console.error('Cover image upload error:', e);
    res.status(500).json({ message: e.message || 'Failed to upload cover image' });
  }
}

export { getRestaurantInfo, updateRestaurantInfo, uploadCoverImage };
