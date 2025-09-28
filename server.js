const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Lakshmana\'s Medicine Quality Monitoring API',
    project: 'Final Year Project - Automated Medicine Quality Monitoring using ML and IoT',
    author: 'Lakshmana',
    version: '1.0.0',
    status: 'running',
    database: 'MongoDB Atlas',
    endpoints: {
      'POST /api/sensors/data': 'Store sensor data',
      'GET /api/sensors/truck/:truckId': 'Get truck sensor data',
      'GET /api/sensors/trucks/status': 'Get all trucks status',
      'GET /api/sensors/alerts': 'Get unsafe readings',
      'GET /api/sensors/health': 'Health check'
    }
  });
});

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
      
      if (data.truckId) {
        // Get latest data for specific truck
        const latestData = await SensorData.getLatestForTruck(data.truckId);
        socket.emit('latestData', latestData);
      } else {
        // Get latest data for all trucks
        const allTrucksData = await SensorData.aggregate([
          { $sort: { timestamp: -1 } },
          {
            $group: {
              _id: '$truckId',
              latestData: { $first: '$$ROOT' }
            }
          }
        ]);
        socket.emit('allTrucksData', allTrucksData);
      }
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

  // Handle client joining truck-specific room
  socket.on('joinTruckRoom', (truckId) => {
    socket.join(`truck_${truckId}`);
    console.log(`Client ${socket.id} joined room for truck ${truckId}`);
  });

  // Handle client leaving truck-specific room
  socket.on('leaveTruckRoom', (truckId) => {
    socket.leave(`truck_${truckId}`);
    console.log(`Client ${socket.id} left room for truck ${truckId}`);
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
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket enabled for real-time communication`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };
