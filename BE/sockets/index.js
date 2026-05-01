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
      const user = await User.findById(payload.id).select('role');
      if (!user) return next(new Error('Unauthorized'));
      if (!['admin', 'staff', 'cashier'].includes(user.role)) {
        return next(new Error('Forbidden'));
      }

      socket.data.user = { id: String(user._id), role: user.role };
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', (room) => {
      if (room === 'kitchen') {
        socket.join(room);
        return;
      }
      if (socket.data.user?.role === 'admin' || socket.data.user?.role === 'staff') {
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
