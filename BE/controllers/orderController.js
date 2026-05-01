import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import { nextQueueNumber } from '../services/queueService.js';
import { getIo } from '../sockets/index.js';
import { validationResult } from 'express-validator';

const ACTIVE_QUEUE_STATUSES = ['pending', 'preparing', 'ready'];
const ORDER_STATUSES = new Set(['pending', 'preparing', 'ready', 'served']);

function withQueuePosition(order, queuePosition) {
  const normalized = order?.toObject ? order.toObject() : order;
  return { ...normalized, queuePosition };
}

async function buildQueueSnapshot() {
  const activeOrders = await Order.find({ status: { $in: ACTIVE_QUEUE_STATUSES } })
    .populate('tableId')
    .sort({ createdAt: 1, _id: 1 });

  return activeOrders.map((order, index) => withQueuePosition(order, index + 1));
}

async function createOrder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { tableId, token, items } = req.body;
  if (!tableId || !token || !items || !items.length) return res.status(400).json({ message: 'Invalid payload' });

  const table = await Table.findById(tableId);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  if (table.qrToken !== token) return res.status(403).json({ message: 'Invalid QR token' });

  const requestedItems = items.map((item) => ({
    itemId: String(item.itemId || ''),
    qty: Number(item.qty || 1),
  }));
  const requestedIds = requestedItems.map((item) => item.itemId).filter(Boolean);
  const menuItems = await MenuItem.find({ _id: { $in: requestedIds }, available: true }).lean();
  if (menuItems.length !== requestedIds.length) {
    return res.status(400).json({ message: 'One or more menu items are unavailable or invalid' });
  }

  const menuItemMap = new Map(menuItems.map((item) => [String(item._id), item]));
  const sanitizedItems = requestedItems.map((requestedItem) => {
    const menuItem = menuItemMap.get(requestedItem.itemId);
    const qty = Number.isInteger(requestedItem.qty) && requestedItem.qty > 0 ? requestedItem.qty : 1;
    return {
      name: menuItem.name,
      qty,
      price: menuItem.price,
    };
  });

  const queueNumber = await nextQueueNumber();
  const totalAmount = sanitizedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const order = await Order.create({ tableId: table._id, queueNumber, items: sanitizedItems, totalAmount });
  const queueSnapshot = await buildQueueSnapshot();
  const createdOrder = queueSnapshot.find((entry) => String(entry._id) === String(order._id));

  // emit to kitchen
  try {
    const io = getIo();
    io.to('kitchen').emit('newOrder', createdOrder || withQueuePosition(order, queueSnapshot.length + 1));
    io.to('kitchen').emit('queueSnapshot', queueSnapshot);
  } catch (e) {
    // socket not initialized yet
  }

  res.status(201).json(createdOrder || withQueuePosition(order, queueSnapshot.length + 1));
}

async function listOrders(req, res) {
  const includeHistory = String(req.query.includeHistory || 'false') === 'true';
  const queueSnapshot = await buildQueueSnapshot();

  if (!includeHistory) {
    return res.json(queueSnapshot);
  }

  const queueMap = new Map(queueSnapshot.map((order) => [String(order._id), order.queuePosition]));
  const orders = await Order.find({})
    .populate('tableId')
    .sort({ createdAt: -1, _id: -1 });

  const withPosition = orders.map((order) => withQueuePosition(order, queueMap.get(String(order._id)) || null));
  res.json(withPosition);
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ message: 'Invalid order status' });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const populatedOrder = await Order.findById(order._id).populate('tableId');
  const queueSnapshot = await buildQueueSnapshot();
  const queuePosition = queueSnapshot.find((entry) => String(entry._id) === String(populatedOrder._id))?.queuePosition || null;
  const enrichedOrder = withQueuePosition(populatedOrder, queuePosition);

  try {
    const io = getIo();
    io.to('kitchen').emit('orderUpdated', enrichedOrder);
    io.to('kitchen').emit('queueSnapshot', queueSnapshot);
    io.to(String(order.tableId)).emit('orderUpdated', enrichedOrder);
  } catch (e) {}
  res.json(enrichedOrder);
}

async function markPaid(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.paymentStatus = 'paid';
  await order.save();
  res.json(order);
}

export { createOrder, listOrders, updateStatus, markPaid };
