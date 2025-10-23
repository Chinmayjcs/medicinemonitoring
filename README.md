# Medicine Quality Monitoring Backend API

A Node.js backend system for automated medicine quality monitoring using IoT sensors and machine learning.

## 🚀 Features

- **Real-time Sensor Data Processing**: Accepts temperature, humidity, and illuminance data from IoT sensors
- **MongoDB Integration**: Stores sensor data with proper validation and indexing
- **WebSocket Support**: Real-time communication with frontend applications
- **ML Model Integration**: Placeholder endpoints for machine learning analysis
- **RESTful API**: Clean and documented API endpoints
- **Data Validation**: Comprehensive input validation using Joi
- **Error Handling**: Robust error handling and logging

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone and navigate to the project directory**
   ```bash
   cd coldchainusingiot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the MongoDB connection string and other configurations

4. **Start MongoDB** (if using local instance)
   ```bash
   mongod
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## 📡 API Endpoints

### Sensor Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensors/data` | Store new sensor data |
| GET | `/api/sensors/latest` | Get latest sensor data |
| GET | `/api/sensors/status` | Get all sensor data |
| GET | `/api/sensors/alerts` | Get unsafe readings (alerts) |
| GET | `/api/sensors/health` | Health check endpoint |

### Sample Sensor Data Format

```json
{
  "temperature": 25.5,
  "humidity": 60.2,
  "illuminance": 150.0,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🧪 Testing with Postman

### 1. Store Sensor Data
- **Method**: POST
- **URL**: `http://localhost:5000/api/sensors/data`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "temperature": 8.5,
  "humidity": 45.2,
  "illuminance": 120.0
}
```

### 2. Get Truck Status
- **Method**: GET
- **URL**: `http://localhost:5000/api/sensors/truck/TRUCK_001`

### 3. Get All Trucks Status
- **Method**: GET
- **URL**: `http://localhost:5000/api/sensors/trucks/status`

### 4. Get Alerts
- **Method**: GET
- **URL**: `http://localhost:5000/api/sensors/alerts`

## 🔌 WebSocket Events

### Client to Server Events
- `requestLatestData`: Request latest sensor data
- `requestAlerts`: Request current alerts
- `joinTruckRoom`: Join truck-specific room for updates
- `leaveTruckRoom`: Leave truck-specific room

### Server to Client Events
- `newSensorData`: New sensor data received
- `latestData`: Response to latest data request
- `alerts`: Current alerts data
- `connected`: Connection confirmation

## 🤖 ML Model Integration

The system includes placeholder functions for ML model integration:

- `triggerMLAnalysis()`: Triggers ML analysis for new sensor data
- `callMLModel()`: Makes API calls to ML model service
- Mock ML responses are currently implemented for testing

**Note**: Your ML team member will implement the actual model endpoints.

## 📁 Project Structure

```
coldchainusingiot/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── sensorController.js  # Business logic
├── middleware/
│   └── validation.js        # Input validation
├── models/
│   └── SensorData.js        # MongoDB schema
├── routes/
│   └── sensorRoutes.js      # API routes
├── .env                     # Environment variables
├── .env.example            # Environment template
├── package.json            # Dependencies
├── server.js               # Main server file
└── README.md               # Documentation
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/medicine_monitoring |
| `NODE_ENV` | Environment mode | development |
| `ML_MODEL_URL` | ML model API endpoint | http://localhost:8000/predict |
| `FRONTEND_URL` | Frontend application URL | http://localhost:3000 |

## 🚨 Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "temperature",
      "message": "Temperature is required"
    }
  ]
}
```

## 📊 Data Validation

- **Temperature**: -50°C to 100°C
- **Humidity**: 0% to 100%
- **Illuminance**: Positive numbers only

## 🔄 Real-time Updates

The system provides real-time updates through WebSocket connections:

1. New sensor data triggers immediate ML analysis
2. Results are broadcast to connected clients
3. Alerts are sent in real-time for unsafe conditions
4. Frontend receives automatic updates without manual refresh

## 🛡️ Security Features

- Helmet.js for security headers
- Input validation and sanitization
- CORS configuration
- Error message filtering in production

## 📈 Future Enhancements

- Authentication and authorization
- Rate limiting
- Data aggregation and analytics
- Historical data visualization
- Mobile app integration
- Advanced ML model features

## 🤝 Team Integration

- **Backend** (Your part): ✅ Complete
- **ML Model**: Placeholder ready for integration
- **Frontend**: WebSocket and REST API ready for consumption

## 📞 Support

For issues or questions, contact the development team or refer to the project documentation.
