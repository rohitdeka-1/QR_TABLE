import Restaurant from '../models/Restaurant.js';

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

export { getRestaurantInfo, updateRestaurantInfo };
