import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  // Backwards-compatible single-role field kept for older code; prefer `roles` array
  role: { type: String, enum: ['admin', 'staff', 'cashier'], default: 'staff' },
  // New: multi-role support and tenant association
  roles: { type: [String], default: undefined },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Ensure `roles` is populated for older documents which only used `role`
UserSchema.pre('save', function (next) {
  if (!this.roles || !this.roles.length) {
    if (this.role) this.roles = [this.role];
    else this.roles = ['staff'];
  }
  next();
});

export default mongoose.model('User', UserSchema);
