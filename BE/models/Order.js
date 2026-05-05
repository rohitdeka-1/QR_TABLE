import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  name: String,
  qty: Number,
  price: Number,
});

const OrderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  queueNumber: { type: Number, required: true },
  customerName: { type: String },
  paymentMode: { type: String, enum: ['upi', 'cash', 'card'], default: 'cash' },
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'preparing', 'served'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  createdAt: { type: Date, default: Date.now },
  servedAt: { type: Date },
});

OrderSchema.index({ restaurantId: 1, status: 1, createdAt: 1 });

export default mongoose.model('Order', OrderSchema);
