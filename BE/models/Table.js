import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d+$/, 'Table number must be numeric'],
  },
  qrToken: { type: String, required: true },
  accessCode: { type: String, required: true, unique: true },
  qrVersion: { type: Number, default: 1 },
  qrCodeImage: { type: String }, // Base64 PNG data URL (persisted)
  qrUrl: { type: String }, // The menu URL encoded in QR
  qrFilePath: { type: String }, // Absolute path to saved QR PNG file
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Table', TableSchema);
