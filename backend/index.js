const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// CORS (important for frontend connection)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use((req, res, next) => {
    console.log(`\n📡 ${req.method} ${req.url}`);
    next();
});

// ─── API ROUTES ───────────────────────────────────────────────
app.use('/api', require('./route'));

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.url });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: err.message });
});

// ─── START ────────────────────────────────────────────────────
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

    console.log(`🚀 API Server running → http://localhost:${PORT}`);
});