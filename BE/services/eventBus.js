// Simple EventBus abstraction. Currently uses WebSocket adapter; can be swapped to Pub/Sub.
let adapter = null;

export function registerAdapter(a) {
  adapter = a;
}

export async function publish(eventName, payload = {}) {
  if (!adapter) return Promise.resolve();
  return adapter.publish(eventName, payload);
}

export function subscribe(eventName, handler) {
  if (!adapter) return;
  return adapter.subscribe(eventName, handler);
}
