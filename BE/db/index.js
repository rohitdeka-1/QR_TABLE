import mongoose from 'mongoose';
import config from '../config/index.js';

async function connect() {
  try {
    // Mongoose 6+ no longer needs deprecated driver options
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
}

export { connect };
