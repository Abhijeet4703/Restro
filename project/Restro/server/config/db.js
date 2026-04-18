const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restro';
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If local MongoDB unavailable, try in-memory server for development
    if (process.env.NODE_ENV === 'development') {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        console.log('Local MongoDB not available. Starting in-memory MongoDB...');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
        return;
      } catch (memError) {
        console.error('In-memory MongoDB also failed:', memError.message);
      }
    }
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
