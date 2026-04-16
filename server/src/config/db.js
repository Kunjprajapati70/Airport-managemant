/**
 * db.js
 * Mongoose connection with graceful shutdown handling.
 * Called once at app startup — process exits on failure so the
 * container/process manager can restart cleanly.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 no longer needs these flags, but kept for clarity
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`);

    // Graceful shutdown — close connection when process terminates
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed (SIGINT)');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed (SIGTERM)');
      process.exit(0);
    });

  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
