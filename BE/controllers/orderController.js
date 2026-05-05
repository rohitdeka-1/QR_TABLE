import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import { nextQueueNumber } from '../services/queueService.js';
import { publish } from '../services/eventBus.js';
import { validationResult } from 'express-validator';

const ACTIVE_QUEUE_STATUSES = ['pending', 'preparing'];
const ORDER_STATUSES = new Set(['pending', 'preparing', 'served']);

function withQueuePosition(order, queuePosition) {
  const normalized = order?.toObject ? order.toObject() : order;
  return { ...normalized, queuePosition };
}

// Automatic status transition: pending -> preparing after 3 seconds
function scheduleStatusTransition(orderId) {
  setTimeout(async () => {
    try {
      const order = await Order.findById(orderId);
      if (order && order.status === 'pending') {
        order.status = 'preparing';
        await order.save();
        // Publish status change event
        try {
          await publish('order.status-changed', { orderId: String(orderId), status: 'preparing', restaurantId: String(order.restaurantId) });
        } catch (e) {
          // ignore publish errors
        }
      }
    } catch (e) {
      console.error('Error transitioning order status:', e);
    }
  }, 3000); // 3 seconds
}

async function buildQueueSnapshot(restaurantId) {
  const query = { status: { $in: ACTIVE_QUEUE_STATUSES } };
  if (restaurantId) query.restaurantId = restaurantId;
  const activeOrders = await Order.find(query)
    .populate('tableId')
    .sort({ createdAt: 1, _id: 1 });

  return activeOrders.map((order, index) => withQueuePosition(order, index + 1));
}

async function createOrder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { tableId, token, items, customerName, taxAmount, totalAmount: requestedTotalAmount } = req.body;
  if (!tableId || !token || !items || !items.length) return res.status(400).json({ message: 'Invalid payload' });

  const table = await Table.findById(tableId);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  if (table.qrToken !== token) return res.status(403).json({ message: 'Invalid QR token' });

  const restaurantId = table.restaurantId;

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
  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  
  // Use provided tax amount if available, otherwise calculate 5% GST
  const tax = taxAmount || (subtotal * 0.05);
  const totalAmount = requestedTotalAmount || (subtotal + tax);

  const order = await Order.create({ 
    restaurantId, 
    tableId: table._id, 
    queueNumber, 
    items: sanitizedItems, 
    subtotal,
    taxAmount: tax,
    totalAmount,
    customerName: customerName || '',
  });
  
  // Schedule automatic status transition from pending to preparing after 3 seconds
  scheduleStatusTransition(order._id);
  
  const queueSnapshot = await buildQueueSnapshot(restaurantId);
  const createdOrder = queueSnapshot.find((entry) => String(entry._id) === String(order._id));

  // publish event via EventBus
  try {
    await publish('order.created', { order: createdOrder || withQueuePosition(order, queueSnapshot.length + 1), restaurantId: String(restaurantId), orderId: String(order._id), tableId: String(table._id) });
    await publish('queue.snapshot', { queueSnapshot, restaurantId: String(restaurantId) });
  } catch (e) {
    // ignore
  }

  res.status(201).json(createdOrder || withQueuePosition(order, queueSnapshot.length + 1));
}

async function listOrders(req, res) {
  const includeHistory = String(req.query.includeHistory || 'false') === 'true';
  const statusFilter = req.query.status_filter || 'all';
  const queueSnapshot = await buildQueueSnapshot(req.restaurantId);

  if (!includeHistory) {
    return res.json(queueSnapshot);
  }

  const queueMap = new Map(queueSnapshot.map((order) => [String(order._id), order.queuePosition]));
  const q = {};
  if (req.restaurantId) q.restaurantId = req.restaurantId;
  if (statusFilter !== 'all') q.status = statusFilter;
  
  const orders = await Order.find(q)
    .populate('tableId')
    .sort({ createdAt: -1, _id: -1 });

  const withPosition = orders.map((order) => withQueuePosition(order, queueMap.get(String(order._id)) || null));
  res.json(withPosition);
}

function toCustomerOrder(order) {
  const normalized = order?.toObject ? order.toObject() : order;
  return {
    id: String(normalized._id),
    _id: normalized._id,
    status: normalized.status,
    table_number: normalized.tableId?.tableNumber || '',
    items: (normalized.items || []).map((item) => ({
      name: item.name,
      quantity: item.qty,
      price: item.price,
    })),
    total: normalized.totalAmount,
    paymentStatus: normalized.paymentStatus,
    createdAt: normalized.createdAt,
  };
}

async function getOrder(req, res) {
  const order = await Order.findById(req.params.id).populate('tableId');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(toCustomerOrder(order));
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ message: 'Invalid order status' });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const populatedOrder = await Order.findById(order._id).populate('tableId');
  const queueSnapshot = await buildQueueSnapshot(populatedOrder.restaurantId);
  const queuePosition = queueSnapshot.find((entry) => String(entry._id) === String(populatedOrder._id))?.queuePosition || null;
  const enrichedOrder = withQueuePosition(populatedOrder, queuePosition);

  try {
    await publish('order.updated', { order: enrichedOrder, restaurantId: String(populatedOrder.restaurantId), orderId: String(order._id), tableId: String(order.tableId) });
    await publish('queue.snapshot', { queueSnapshot, restaurantId: String(populatedOrder.restaurantId) });
    await publish('order.to.table', { order: enrichedOrder, restaurantId: String(populatedOrder.restaurantId), tableId: String(order.tableId), orderId: String(order._id) });
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

async function updatePaymentDetails(req, res) {
  const { paymentMode, customerName } = req.body;
  try {
    const updates = {};
    if (paymentMode) updates.paymentMode = paymentMode;
    if (customerName) updates.customerName = customerName;
    
    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('tableId').populate('restaurantId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

async function getBillData(req, res) {
  try {
    const order = await Order.findById(req.params.id).populate('tableId').populate('restaurantId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Ensure restaurantId exists (handle broken references)
    if (!order.restaurantId) {
      return res.status(404).json({ message: 'Restaurant reference not found' });
    }
    
    // Check if order belongs to user's restaurant
    if (req.restaurantId && String(order.restaurantId._id) !== String(req.restaurantId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export { createOrder, listOrders, getOrder, updateStatus, markPaid, updatePaymentDetails, getBillData };
