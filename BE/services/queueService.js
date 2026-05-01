import Counter from '../models/Counter.js';
import config from '../config/index.js';

async function nextQueueNumber(key = 'order_queue') {
  const today = new Date();
  const resetKey = `${key}:${today.toISOString().slice(0,10)}`;

  const counter = await Counter.findOneAndUpdate(
    { key: resetKey },
    { $inc: { seq: 1 }, $setOnInsert: { resetAt: today } },
    { upsert: true, new: true }
  );

  return counter.seq;
}

export { nextQueueNumber };
