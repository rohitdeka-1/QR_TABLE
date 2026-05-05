import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import config from '../config/index.js';

let io;

function init(server, options = {}) {
  io = new Server(server, options);

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || '';
      const cookieToken = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('qr_restaurant_token='))
        ?.split('=')[1];
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '') || cookieToken;
      if (!token) {
        socket.data.user = null;
        return next();
      }

      try {
        const payload = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(payload.id).select('roles restaurantId');
        if (user) {
          const roles = (user.roles && user.roles.length) ? user.roles : (payload.roles || (payload.role ? [payload.role] : []));
          socket.data.user = { id: String(user._id), roles, restaurantId: String(user.restaurantId || payload.restaurantId || '') };
        } else {
          socket.data.user = null;
        }
      } catch (err) {
        socket.data.user = null;
      }
      next();
    } catch (error) {
      socket.data.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    // auto-join restaurant rooms for convenience
    const rest = socket.data.user?.restaurantId;
    if (rest) {
      socket.join(`restaurant:${rest}`);
      // join kitchen room if user has kitchen/admin role
      const roles = socket.data.user?.roles || [];
      if (roles.includes('kitchen') || roles.includes('admin')) {
        socket.join(`restaurant:${rest}:kitchen`);
      }
    }

    socket.on('join', async (room, token) => {
      // allow joining only rooms in same restaurant or specific order/table where restaurantId matches
      if (!room) return;
      if (room.startsWith('restaurant:')) {
        // only allow if authenticated for that restaurant
        if (!socket.data.user) return;
        const [, rId] = room.split(':');
        if (String(rId) === String(socket.data.user?.restaurantId)) socket.join(room);
        return;
      }
      // For order rooms: require the table token to prevent IDOR traversal
      if (room.startsWith('order:')) {
        const orderId = room.split(':')[1];
        try {
          const order = await Order.findById(orderId).populate('tableId').select('tableId');
          if (!order) return;
          // Admins/staff can join freely; anonymous customers must prove ownership via token
          const isStaff = socket.data.user?.roles?.some(r => ['admin', 'kitchen', 'staff'].includes(r));
          if (!isStaff && (!token || order.tableId?.qrToken !== token)) return;
          socket.join(room);
        } catch (_) {}
        return;
      }
      // table:<id> rooms: allow freely (no sensitive data broadcast there)
      if (room.startsWith('table:')) {
        socket.join(room);
      }
    });

    socket.on('leave', (room) => {
      socket.leave(room);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export { init, getIo };
