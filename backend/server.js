const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const { startMlService, stopMlService } = require('./ml-service-runner');

// Import database connection
const connectDB = require('./config/database');

// Import routes
const sensorRoutes = require('./routes/sensorRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// List top N documents from ml-training-dataset (default 10)
// GET /api/debug/ml-training-dataset/top?limit=10
app.get('/api/debug/ml-training-dataset/top', async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 1 = connected
    if (state !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Mongoose is not connected to MongoDB',
        readyState: state
      });
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 100));
    const collection = mongoose.connection.db.collection('ml-training-dataset');
    // Sort by newest first using _id (ObjectId timestamp) if no explicit timestamp exists
    const docs = await collection
      .find({}, { projection: { /* include all fields */ } })
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();

    return res.json({
      success: true,
      count: docs.length,
      limit,
      data: docs
    });
  } catch (err) {
    console.error('Fetching top documents failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch documents from ml-training-dataset',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
    });
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('combined')); // Logging
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/sensors', sensorRoutes);

// =================== ML PROXY ROUTES ===================
// Normalize ML service base URL to avoid accidental extra path segments
function getMlBase() {
  const raw = process.env.ML_MODEL_URL || 'http://localhost:8000';
  try {
    const u = new URL(raw);
    return u.origin; // strip any pathname like /predict
  } catch (e) {
    // allow values without scheme (e.g., localhost:8000)
    try {
      const u = new URL(`http://${raw}`);
      return u.origin;
    } catch {
      return 'http://localhost:8000';
    }
  }
}
// Train the Random Forest model using data from MongoDB (ml-service consumes directly from DB)
app.post('/api/ml/train', async (req, res) => {
  try {
    const base = getMlBase();
    const { data } = await axios.post(`${base}/train`);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('ML train proxy error:', err.message);
    return res.status(500).json({ success: false, message: 'ML train failed', error: err.response?.data || err.message });
  }
});

// Predict SAFE/UNSAFE with confidence using temperature, humidity, lux
app.post('/api/ml/predict', async (req, res) => {
  try {
    const { temperature, humidity, lux, illuminance } = req.body || {};
    const payload = {
      temperature,
      humidity,
      // Accept either lux or illuminance from clients, map to lux for ml-service
      lux: typeof lux !== 'undefined' ? lux : illuminance
    };
    const base = getMlBase();
    const { data } = await axios.post(`${base}/predict`, payload);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('ML predict proxy error:', err.message);
    return res.status(500).json({ success: false, message: 'ML predict failed', error: err.response?.data || err.message });
  }
});

// Debug route to verify access to the historical ML training dataset collection
// GET /api/debug/ml-training-dataset/check
app.get('/api/debug/ml-training-dataset/check', async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 1 = connected
    if (state !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Mongoose is not connected to MongoDB',
        readyState: state
      });
    }

    const dbName = mongoose.connection.name;
    const collection = mongoose.connection.db.collection('ml-training-dataset');
    const count = await collection.countDocuments();
    const sample = await collection.find({}).limit(1).toArray();

    return res.json({
      success: true,
      connected: true,
      db: dbName,
      collection: 'ml-training-dataset',
      count,
      sample: sample[0] || null
    });
  } catch (err) {
    console.error('ML training dataset check failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to access ml-training-dataset collection',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Team CCAD s\'Medicine Quality Monitoring API',
    project: 'Final Year Project - Automated Medicine Quality Monitoring using ML and IoT',
    author: 'Team CCAD',
    version: '1.0.0',
    status: 'running',
    database: 'MongoDB Atlas',
    endpoints: {
      'POST /api/sensors/data': 'Store sensor data',
      'GET /api/sensors/latest': 'Get latest sensor data',
      'GET /api/sensors/status': 'Get all sensor data',
      'GET /api/sensors/alerts': 'Get unsafe readings',
      'GET /api/sensors/health': 'Health check'
    }
  });
});

// =================== FRONTEND INTEGRATION POINT ===================
// Frontend should connect to these Socket.IO events for real-time data.
// ================================================================
// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to Medicine Quality Monitoring System',
    timestamp: new Date().toISOString()
  });

  // Handle client requesting latest data
  socket.on('requestLatestData', async (data) => {
    try {
      const SensorData = require('./models/SensorData');
      
      // Get latest sensor data
      const latestData = await SensorData.find().sort({ timestamp: -1 }).limit(10);
      socket.emit('latestData', latestData);
    } catch (error) {
      console.error('Error fetching latest data:', error);
      socket.emit('error', { message: 'Failed to fetch latest data' });
    }
  });

  // Handle client requesting alerts
  socket.on('requestAlerts', async () => {
    try {
      const SensorData = require('./models/SensorData');
      const alerts = await SensorData.getUnsafeReadings();
      socket.emit('alerts', alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      socket.emit('error', { message: 'Failed to fetch alerts' });
    }
  });


  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket enabled for real-time communication`);
  // Start ML service alongside the backend
  try {
    await startMlService();
  } catch (e) {
    console.warn('Failed to start ML service automatically:', e?.message || e);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  stopMlService();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  stopMlService();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io };
