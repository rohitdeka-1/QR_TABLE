import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  timezone: { type: String },
  address: { type: String },
  phone: { type: String },
  gstin: { type: String },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  coverImage: { type: String },
  settings: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Restaurant', RestaurantSchema);
