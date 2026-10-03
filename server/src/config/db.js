const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';
  const isMemory = !mongoUri || mongoUri.toLowerCase() === 'memory';

  if (isMemory) {
    console.log('Using IN-MEMORY database (data will be lost on restart)');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      return conn;
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB server:', memErr.message);
      process.exit(1);
    }
  }

  // Persistent MongoDB connection (e.g. MongoDB Atlas)
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });

    console.log(`Connected to persistent MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Failed to connect to persistent MongoDB at MONGODB_URI. Terminating to avoid unintended data loss.');
    process.exit(1);
  }
};

module.exports = connectDB;
