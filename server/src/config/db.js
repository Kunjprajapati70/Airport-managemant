/**
 * db.js
 * Mongoose connection configured for MongoDB Atlas.
 * Called once at app startup — process exits on failure so the
 * container/process manager can restart cleanly.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      ssl:                      true,
      serverSelectionTimeoutMS: 10000, // 10s to find a server before failing
      socketTimeoutMS:          45000, // 45s for slow Atlas queries
      maxPoolSize:              10,    // max concurrent connections
    });

    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host} / ${conn.connection.name}`);

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
    console.error(`❌ MongoDB Atlas connection failed: ${err.message}`);
    console.error('   → Verify your MONGO_URI, Atlas Network Access (IP whitelist), and credentials.');
    process.exit(1);
  }
};

module.exports = connectDB;
