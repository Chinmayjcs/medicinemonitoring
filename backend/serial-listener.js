const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');
require('dotenv').config();

/**
 * Initializes a serial listener that reads data lines from Arduino over USB
 * and forwards them to the existing /api/sensors/data endpoint so the normal
 * validation, DB write, WebSocket broadcast and ML workflow are triggered.
 */
function initSerialListener(options = {}) {
  const portPath = process.env.SERIAL_PORT || options.port || 'COM3';
  const baudRate = Number(process.env.SERIAL_BAUDRATE || options.baudRate || 9600);
  const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

  console.log(`[serial-listener] Opening serial port ${portPath} @ ${baudRate} baud`);

  const port = new SerialPort({ path: portPath, baudRate });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  parser.on('data', async (line) => {
    line = (line || '').trim();
    if (!line) return;

    let payload;
    try {
      // Prefer JSON lines: {"temperature":25.4,"humidity":60.1,"illuminance":150}
      payload = JSON.parse(line);
    } catch {
      // Fallback CSV: 25.4,60.1,150
      const parts = line.split(/[ ,]+/).map(Number);
      if (parts.length >= 3) {
        payload = {
          temperature: parts[0],
          humidity: parts[1],
          illuminance: parts[2]
        };
      }
    }

    if (!payload || [payload.temperature, payload.humidity, payload.illuminance].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
      console.warn(`[serial-listener] Invalid data received: ${line}`);
      return;
    }

    try {
      const url = `${apiBase}/api/sensors/data`;
      await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
      // Success is silent; backend will handle further actions.
    } catch (err) {
      console.error('[serial-listener] Failed to POST sensor data:', err.message || err);
    }
  });

  port.on('error', (err) => console.error('[serial-listener] Serial port error:', err.message || err));
}

module.exports = { initSerialListener };
