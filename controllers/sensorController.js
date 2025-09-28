const SensorData = require('../models/SensorData');
const axios = require('axios');

// Store sensor data and trigger ML analysis
// [Lakshmana's Part - Step 1: Receive and Store Data]
// This function is the entry point for sensor data. It receives the data,
// saves it to the database, and then triggers the ML analysis.
const storeSensorData = async (req, res) => {
  console.log('------------------------------------');
  console.log('[SERVER LOG] Received new request to store sensor data...');
  try {
        // The data has already been validated by the `validateSensorData` middleware.
    console.log('[SERVER LOG] Data validated successfully. Body:', req.body);

    // Create new sensor data record
    const sensorData = new SensorData({
      ...req.body,
      timestamp: req.body.timestamp || new Date()
    });

        // Save to database
    console.log('[SERVER LOG] Saving data to MongoDB...');
    const savedData = await sensorData.save();
    console.log(`[SERVER LOG] Data saved successfully with ID: ${savedData._id}`);

        // Emit real-time data to connected clients (for the live dashboard)
    console.log('[SERVER LOG] Emitting new data via Socket.IO to the frontend...');
    if (req.io) {
      req.io.emit('newSensorData', {
        id: savedData._id,
        truckId: savedData.truckId,
        temperature: savedData.temperature,
        humidity: savedData.humidity,
        illuminance: savedData.illuminance,
        timestamp: savedData.timestamp,
        mlAnalysis: savedData.mlAnalysis
      });
    }

        // [Lakshmana's Part - Step 2: Trigger ML Analysis]
    // Now, pass the data to the ML model for analysis.
    console.log('[SERVER LOG] Triggering ML analysis...');
    triggerMLAnalysis(savedData, req.io); // Pass the full data object and io instance

    res.status(201).json({
      success: true,
      message: 'Sensor data stored successfully',
      data: {
        id: savedData._id,
        truckId: savedData.truckId,
        timestamp: savedData.timestamp,
        mlAnalysis: savedData.mlAnalysis
      }
    });

  } catch (error) {
    console.error('Error storing sensor data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store sensor data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get latest sensor data for a specific truck
const getLatestSensorData = async (req, res) => {
  try {
    const { truckId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const sensorData = await SensorData.find({ truckId })
      .sort({ timestamp: -1 })
      .limit(limit);

    if (!sensorData || sensorData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sensor data found for this truck'
      });
    }

    res.json({
      success: true,
      data: sensorData,
      count: sensorData.length
    });

  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all trucks with their latest status
const getAllTrucksStatus = async (req, res) => {
  try {
    const trucksStatus = await SensorData.aggregate([
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$truckId',
          latestData: { $first: '$$ROOT' }
        }
      },
      {
        $project: {
          truckId: '$_id',
          temperature: '$latestData.temperature',
          humidity: '$latestData.humidity',
          illuminance: '$latestData.illuminance',
          timestamp: '$latestData.timestamp',
          mlAnalysis: '$latestData.mlAnalysis',
          location: '$latestData.location'
        }
      }
    ]);

    res.json({
      success: true,
      data: trucksStatus,
      count: trucksStatus.length
    });

  } catch (error) {
    console.error('Error fetching trucks status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trucks status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get unsafe readings (alerts)
const getUnsafeReadings = async (req, res) => {
  try {
    const unsafeReadings = await SensorData.find({
      'mlAnalysis.status': 'unsafe'
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      data: unsafeReadings,
      count: unsafeReadings.length
    });

  } catch (error) {
    console.error('Error fetching unsafe readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unsafe readings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// [ML MODEL PART - To be done by your friend]
// This function simulates the process of calling the ML model.
// It receives the newly saved data and is responsible for getting the 'safe'/'unsafe' status.
const triggerMLAnalysis = async (sensorData, io) => {
  console.log(`[ML LOG] Starting analysis for data ID: ${sensorData._id}`);

  // =================== FOR YOUR FRIEND (ML PART) ===================
  // HEY! Your work starts here.
  // You need to get the 'safe' or 'unsafe' status from your model.
  //
  // OPTION 1: If your model is a simple function within this project:
  //   - Call your function here, passing it `sensorData`.
  //   - Example: const analysisResult = yourLocalMLFunction(sensorData);
  //
  // OPTION 2: If your model is hosted on a separate server (e.g., a Python Flask/FastAPI server):
  //   - Use the `callMLModel` function below to make an HTTP request to it.
  //   - Example: const analysisResult = await callMLModel(sensorData);
  //
  // The `analysisResult` object should look like this:
  // { 
  //   status: 'safe' | 'unsafe',
  //   confidence: 0.95, // A number between 0 and 1
  //   riskFactors: [{ factor: 'temperature', severity: 'high' }] // Optional details
  // }
  // =================================================================

  try {
    // --- ML MODEL SIMULATION (BEGIN) ---
    // This `setTimeout` block is a placeholder to simulate the time your ML model takes to run.
    // PLEASE REPLACE THIS BLOCK WITH YOUR ACTUAL ML MODEL CALL.
    console.log('[ML LOG] Simulating a 2-second ML model processing time...');
    setTimeout(async () => {
      try {
        // This is a FAKE response. Your model should generate the real one.
        const mockMLResponse = {
          status: Math.random() > 0.8 ? 'unsafe' : 'safe', // 20% chance of being unsafe
          confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
          riskFactors: Math.random() > 0.5 ? [{ factor: 'temperature_threshold', severity: 'medium' }] : []
        };
        console.log(`[ML LOG] Simulation complete. Result: ${mockMLResponse.status}`);
        // --- ML MODEL SIMULATION (END) ---

        // Update the database record with the ML analysis results
        console.log(`[ML LOG] Updating database record ${sensorData._id} with analysis results...`);
        const updatedData = await SensorData.findByIdAndUpdate(sensorData._id, {
          'mlAnalysis.status': mockMLResponse.status,
          'mlAnalysis.confidence': mockMLResponse.confidence,
          'mlAnalysis.processedAt': new Date(),
          'mlAnalysis.riskFactors': mockMLResponse.riskFactors
        }, { new: true }); // {new: true} returns the updated document

        console.log('[ML LOG] Database updated.');

        // [Real-time Update] Emit the result to the frontend
        // This tells the dashboard to update with the new status.
        if (io) {
          console.log('[ML LOG] Emitting ML analysis result to frontend...');
          io.emit('mlResult', updatedData);
          // Also emit to a specific truck's room if needed
          io.to(`truck_${updatedData.truckId}`).emit('truckUpdate', updatedData);
        }

      } catch (error) {
        console.error('[ML ERROR] Error during ML analysis update:', error);
      }
    }, 2000); // Simulates a 2-second processing time

  } catch (error) {
    console.error('[ML ERROR] Error triggering ML analysis:', error);
  }
};

// [ML MODEL PART - To be done by your friend]
// This function is a helper to call an external ML model API.
const callMLModel = async (sensorData) => {
  // =================== FOR YOUR FRIEND (ML PART) ===================
  // If your model is hosted on another server, this is where you'll call it.
  // 1. Make sure the URL in your .env file (`ML_MODEL_URL`) is correct.
  // 2. The `axios.post` call below sends the sensor data to that URL.
  // 3. Your ML server should be listening for this request, process the data,
  //    and return a JSON response with the analysis result.
  // =================================================================
  try {
    console.log(`[ML LOG] Calling external ML model at: ${process.env.ML_MODEL_URL}`);
    const response = await axios.post(process.env.ML_MODEL_URL, {
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      illuminance: sensorData.illuminance,
      truckId: sensorData.truckId
    });

    console.log('[ML LOG] Received response from external model.');
    return response.data; // This should be the analysisResult object

  } catch (error) {
    console.error('[ML ERROR] Error calling external ML model:', error.message);
    // Return a default error structure so the system doesn't crash
    return {
      status: 'unsafe',
      reason: 'ML model is offline or returned an error.'
    };
  }
};

module.exports = {
  storeSensorData,
  getLatestSensorData,
  getAllTrucksStatus,
  getUnsafeReadings
  // Note: triggerMLAnalysis and callMLModel are internal helper functions
  // and are not called directly by the router.
};
