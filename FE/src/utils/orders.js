export function mergeOrderList(existingOrders, incomingOrder) {
  const orderId = incomingOrder?._id;
  if (!orderId) return existingOrders;
  const filtered = existingOrders.filter((order) => String(order._id) !== String(orderId));
  return [incomingOrder, ...filtered];
}
