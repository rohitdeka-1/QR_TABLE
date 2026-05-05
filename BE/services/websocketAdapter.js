import { getIo } from '../sockets/index.js';

function targetRoomsForEvent(eventName, payload) {
  // Basic mapping: allow payload to include restaurantId, orderId, tableId
  const rooms = [];
  if (payload.restaurantId) rooms.push(`restaurant:${payload.restaurantId}`);
  if (payload.restaurantId && eventName.startsWith('order')) rooms.push(`restaurant:${payload.restaurantId}:kitchen`);
  if (payload.orderId) rooms.push(`order:${payload.orderId}`);
  if (payload.tableId) rooms.push(`table:${payload.tableId}`);
  return rooms;
}

export const websocketAdapter = {
  async publish(eventName, payload) {
    try {
      const io = getIo();
      const rooms = targetRoomsForEvent(eventName, payload);
      if (!rooms.length) return;
      for (const room of rooms) {
        io.to(room).emit(eventName, payload);
      }
    } catch (e) {
      // no-op when sockets not ready
    }
  },
  subscribe() {
    // No-op for websocket-only adapter
  },
};
