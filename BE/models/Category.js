import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
});

CategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', CategorySchema);
