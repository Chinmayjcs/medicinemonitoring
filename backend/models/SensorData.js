const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  // Sensor readings
  temperature: {
    type: Number,
    required: true,
    min: -50,
    max: 100
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  illuminance: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Metadata
  
  // ML Analysis Results (will be updated after ML processing)
  mlAnalysis: {
    status: {
      type: String,
      enum: ['pending', 'safe', 'unsafe'],
      default: 'pending'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    processedAt: {
      type: Date
    },
    riskFactors: [{
      factor: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }]
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'sensor_data'
});

// Indexes for better query performance
sensorDataSchema.index({ 'mlAnalysis.status': 1 });
sensorDataSchema.index({ timestamp: -1 });

// Virtual for getting data age
sensorDataSchema.virtual('dataAge').get(function() {
  return Date.now() - this.timestamp;
});

// Method to check if data is recent (within last 5 minutes)
sensorDataSchema.methods.isRecent = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.timestamp >= fiveMinutesAgo;
};


// Static method to get unsafe readings
sensorDataSchema.statics.getUnsafeReadings = function() {
  return this.find({ 'mlAnalysis.status': 'unsafe' }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('SensorData', sensorDataSchema);
