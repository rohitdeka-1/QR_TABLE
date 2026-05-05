import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
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
      if (!token) return next(new Error('Unauthorized'));

      const payload = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(payload.id).select('roles restaurantId');
      if (!user) return next(new Error('Unauthorized'));
      const roles = (user.roles && user.roles.length) ? user.roles : (payload.roles || (payload.role ? [payload.role] : []));
      socket.data.user = { id: String(user._id), roles, restaurantId: String(user.restaurantId || payload.restaurantId || '') };
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
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

    socket.on('join', (room) => {
      // allow joining only rooms in same restaurant or specific order/table where restaurantId matches
      if (!room) return;
      if (room.startsWith('restaurant:')) {
        // only allow if same restaurant
        const [, rId] = room.split(':');
        if (String(rId) === String(socket.data.user?.restaurantId)) socket.join(room);
        return;
      }
      // allow joining order:<id> or table:<id>
      if (room.startsWith('order:') || room.startsWith('table:')) {
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
