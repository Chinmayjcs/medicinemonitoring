const express = require('express');
const router = express.Router();
const { 
  storeSensorData, 
  getLatestSensorData, 
  getAllSensorStatus,
  getUnsafeReadings 
} = require('../controllers/sensorController');
const { validateSensorData, validateTruckId } = require('../middleware/validation');

// @route   POST /api/sensors/data
// @desc    Store new sensor data from IoT devices
// @access  Public (in production, add authentication)
router.post('/data', validateSensorData, storeSensorData);

// @route   GET /api/sensors/latest
// @desc    Get latest sensor data
// @access  Public
router.get('/latest', getLatestSensorData);

// @route   GET /api/sensors/status
// @desc    Get latest status of all sensor data
// @access  Public
router.get('/status', getAllSensorStatus);

// @route   GET /api/sensors/alerts
// @desc    Get all unsafe readings (alerts)
// @access  Public
router.get('/alerts', getUnsafeReadings);

// @route   GET /api/sensors/health
// @desc    Health check endpoint
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sensor API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
