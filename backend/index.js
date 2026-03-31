// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
    console.log(`\n📡 ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api', require('./route'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Machine Runtime Monitor API',
        version: '1.0.0',
        endpoints: {
            'POST /api/register': 'Register new device',
            'GET /api/devices': 'Get all devices',
            'POST /api/simulate': 'Simulate device data (ON/OFF)',
            'GET /api/runtime/:device_id': 'Get runtime for device',
            'GET /api/logs/:device_id': 'Get machine logs',
            'GET /api/summary': 'Get all devices runtime summary'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.url,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Test with Postman:\n`);
    console.log(`   1. Register device: POST http://localhost:${PORT}/api/register`);
    console.log(`   2. Send ON: POST http://localhost:${PORT}/api/simulate`);
    console.log(`   3. Send OFF: POST http://localhost:${PORT}/api/simulate`);
    console.log(`   4. Check runtime: GET http://localhost:${PORT}/api/runtime/D001\n`);
    
    // Test database connection
    const pool = require('./config/db');
    try {
        await pool.getConnection();
        console.log('✅ MySQL Connected Successfully\n');
    } catch (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
    }
    
    // Initialize MQTT
    const { connectMQTT } = require('./config/mqttClient');
    connectMQTT();
});