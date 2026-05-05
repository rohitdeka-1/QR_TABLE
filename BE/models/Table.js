import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  label: { type: String },
  tableNumber: {
    type: String,
    required: true,
    match: [/^\d+$/, 'Table number must be numeric'],
  },
  qrToken: { type: String, required: true },
  accessCode: { type: String, required: true },
  qrVersion: { type: Number, default: 1 },
  qrCodeImage: { type: String }, // Base64 PNG data URL (persisted)
  qrUrl: { type: String }, // The menu URL encoded in QR
  qrFilePath: { type: String }, // Absolute path to saved QR PNG file
  location: { type: String },
  restaurantLat: { type: Number }, // Restaurant latitude for geolocation
  restaurantLng: { type: Number }, // Restaurant longitude for geolocation
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound unique index so table numbers are unique per restaurant
TableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export default mongoose.model('Table', TableSchema);
