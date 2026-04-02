const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`\n📡 ${req.method} ${req.url}`);
    next();
});

// ─── PAGE ROUTES ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.render('pages/dashboard', { title: 'MachineTrack – Dashboard' });
});

app.get('/device/:device_id', (req, res) => {
    res.render('pages/device', {
        title: `Device ${req.params.device_id}`,
        device_id: req.params.device_id
    });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api', require('./route'));

// ─── 404 / ERROR ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.url });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: err.message });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    const pool = require('./config/db');
    try {
        await pool.getConnection();
        console.log('✅ MySQL Connected Successfully\n');
    } catch (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
    }

    const { connectMQTT } = require('./config/mqttClient');
    connectMQTT();

    console.log(`🚀 Server running → http://localhost:${PORT}\n`);
});