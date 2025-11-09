const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!uri || typeof uri !== 'string' || uri.trim() === '') {
      throw new Error('MONGODB_URI is not set. Create a .env file (or export env vars) with MONGODB_URI and try again.');
    }

    const conn = await mongoose.connect(uri, {
      // Keep legacy opts for older Mongoose, safe to include
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...(dbName ? { dbName } : {}),
    });

    console.log(`MongoDB Connected: ${conn.connection.host}${dbName ? `/${dbName}` : ''}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Troubleshooting tips:\n- Ensure a .env file exists at project root.\n- Set MONGODB_URI and (optionally) MONGODB_DB_NAME.\n- Example: MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/?retryWrites=true&w=majority');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
