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

module.exports = {
  validateSensorData,
  sensorDataSchema
};
