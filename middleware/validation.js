const Joi = require('joi');

// Validation schema for sensor data
const sensorDataSchema = Joi.object({
  temperature: Joi.number()
    .min(-50)
    .max(100)
    .required()
    .messages({
      'number.base': 'Temperature must be a number',
      'number.min': 'Temperature must be above -50°C',
      'number.max': 'Temperature must be below 100°C',
      'any.required': 'Temperature is required'
    }),
  
  humidity: Joi.number()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'Humidity must be a number',
      'number.min': 'Humidity must be above 0%',
      'number.max': 'Humidity must be below 100%',
      'any.required': 'Humidity is required'
    }),
  
  illuminance: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Illuminance must be a number',
      'number.min': 'Illuminance must be a positive number',
      'any.required': 'Illuminance is required'
    }),
  
  truckId: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.base': 'Truck ID must be a string',
      'string.min': 'Truck ID cannot be empty',
      'string.max': 'Truck ID must be less than 50 characters',
      'any.required': 'Truck ID is required'
    }),
  
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  }).optional(),
  
  timestamp: Joi.date().optional()
});

// Middleware function to validate sensor data
const validateSensorData = (req, res, next) => {
  const { error, value } = sensorDataSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }

  // Replace request body with validated and sanitized data
  req.body = value;
  next();
};

// Validation for truck ID parameter
const validateTruckId = (req, res, next) => {
  const { truckId } = req.params;
  
  if (!truckId || truckId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid truck ID is required'
    });
  }
  
  next();
};

module.exports = {
  validateSensorData,
  validateTruckId,
  sensorDataSchema
};
