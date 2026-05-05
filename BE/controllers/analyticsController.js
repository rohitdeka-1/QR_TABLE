import Order from '../models/Order.js';
import mongoose from 'mongoose';

// Basic analytics for admin dashboard
async function getAnalytics(req, res) {
  const restaurantId = req.restaurantId;
  if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

  const match = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };

  const [summary] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: '$totalAmount' },
        total_orders: { $sum: 1 },
        served_count: { $sum: { $cond: [{ $eq: ['$status', 'served'] }, 1, 0] } },
        avg_order: { $avg: '$totalAmount' },
      },
    },
  ]);

  // revenue trend - last 14 days
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 13);

  const trend = await Order.aggregate([
    { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), createdAt: { $gte: past } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // top items
  const topItems = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        quantity: { $sum: '$items.qty' },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: 10 },
    { $project: { name: '$_id', quantity: 1, _id: 0 } },
  ]);

  // status counts
  const statusCountsAgg = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const status_counts = {};
  statusCountsAgg.forEach((r) => (status_counts[r._id] = r.count));

  res.json({
    total_revenue: summary ? summary.total_revenue || 0 : 0,
    total_orders: summary ? summary.total_orders || 0 : 0,
    served_count: summary ? summary.served_count || 0 : 0,
    avg_order: summary ? summary.avg_order || 0 : 0,
    revenue_trend: trend.map((t) => ({ date: t._id, revenue: t.revenue })),
    top_items: topItems,
    status_counts,
  });
}

export { getAnalytics };
