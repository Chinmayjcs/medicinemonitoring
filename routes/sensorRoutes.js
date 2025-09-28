const express = require('express');
const router = express.Router();
const { 
  storeSensorData, 
  getLatestSensorData, 
  getAllTrucksStatus, 
  getUnsafeReadings 
} = require('../controllers/sensorController');
const { validateSensorData, validateTruckId } = require('../middleware/validation');

// @route   POST /api/sensors/data
// @desc    Store new sensor data from IoT devices
// @access  Public (in production, add authentication)
router.post('/data', validateSensorData, storeSensorData);

// @route   GET /api/sensors/truck/:truckId
// @desc    Get latest sensor data for a specific truck
// @access  Public
router.get('/truck/:truckId', validateTruckId, getLatestSensorData);

// @route   GET /api/sensors/trucks/status
// @desc    Get status of all trucks with their latest readings
// @access  Public
router.get('/trucks/status', getAllTrucksStatus);

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
