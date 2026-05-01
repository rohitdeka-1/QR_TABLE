import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  name: String,
  qty: Number,
  price: Number,
});

const OrderSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  queueNumber: { type: Number, required: true },
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'preparing', 'ready', 'served'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Order', OrderSchema);
