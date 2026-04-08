// config/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'mySuperSecretKey123', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: '',
  database: process.env.DB_NAME,
   waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ✅ CHECK CONNECTION
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected Successfully');
    connection.release();
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
  }
})();

module.exports = pool;

// ----------production-----------
// config/db.js
// const mysql = require('mysql2/promise');
// require('dotenv').config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD, // ✅ FIXED
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// // ✅ CHECK CONNECTION
// (async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('✅ MySQL Connected Successfully');
//     connection.release();
//   } catch (err) {
//     console.error('❌ MySQL Connection Failed:', err.message);
//   }
// })();

// module.exports = pool;// config-mqttclient.js


const mqtt = require('mqtt');
const { processRuntime } = require('../controller');

const MQTT_URL         = process.env.MQTT_URL         || 'mqtt://localhost:1883';
const MQTT_TOPIC       = process.env.MQTT_TOPIC       || 'machine_data';
const TIME_SYNC_THRESHOLD = 5000; // ms

let client = null;
const lastStatus = {};

const connectMQTT = () => {
    console.log(`🔌 Connecting to MQTT at ${MQTT_URL}…`);

    client = mqtt.connect(MQTT_URL, {
        clientId:       `backend_${Math.random().toString(16).substr(2, 8)}`,
        clean:          true,
        connectTimeout: 4000,
        reconnectPeriod:1000
    });

    client.on('connect', () => {
        console.log('✅ MQTT Connected:', MQTT_URL);
        client.subscribe(MQTT_TOPIC, err => {
            if (!err) console.log(`📡 Subscribed: ${MQTT_TOPIC}\n`);
        });
    });

    client.on('message', async (topic, message) => {
        const raw = message.toString();
        if (!raw || raw === 'null' || raw.trim() === '') return;

        console.log(`\n📩 MQTT | Topic: ${topic} | Raw: ${raw}`);

        try {
            const data = JSON.parse(raw);
            if (!data.device_id) { 
                console.error('❌ Missing device_id'); 
                return; 
            }

            // Pass the data to processRuntime - threshold will be fetched from DB
            await processRuntime({
                device_id: data.device_id,
                current: data.current || data.current_value || 0,
                status: data.status || data.Device_status || null
            });

        } catch (err) {
            console.error('❌ Parse error:', err.message);
        }
    });

    client.on('error', err  => console.error('❌ MQTT Error:',  err.message));
    client.on('close',      () => console.log('⚠️ MQTT Connection closed'));

    return client;
};

module.exports = { connectMQTT, getClient: () => client };PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=machine_monitor

MQTT_URL=mqtt://mqtt.rank2top.in:1883
MQTT_TOPIC=machine_data

JWT_SECRET=mySuperSecretKey123

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Your frontend URL
    credentials: true
}));
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

// model.js
const pool = require('./config/db');

// Device Model
exports.createDevice = async (device_id, machine_name) => {
    const [result] = await pool.execute(
        'INSERT INTO devices (device_id, machine_name) VALUES (?, ?)',
        [device_id, machine_name]
    );
    return result;
};

exports.getDevices = async () => {
    const [rows] = await pool.execute('SELECT * FROM devices ORDER BY created_at DESC');
    return rows;
};

// Runtime Model - FIXED to get runtime data
exports.getRuntime = async (device_id) => {
    const [rows] = await pool.execute(
        `SELECT r.*, d.machine_name 
         FROM runtime r 
         JOIN devices d ON r.device_id = d.device_id 
         WHERE r.device_id = ? 
         ORDER BY r.date DESC`,
        [device_id]
    );
    return rows;
};

// Get latest status
exports.getLatestStatus = async (device_id) => {
    const [rows] = await pool.execute(
        `SELECT current, status, timestamp 
         FROM machine_logs 
         WHERE device_id = ? 
         ORDER BY timestamp DESC LIMIT 1`,
        [device_id]
    );
    return rows[0];
};const express = require("express");
const router = express.Router();
const controller = require("./controller");
const { authenticateToken } = require("./config/auth");

// ✅ Validation middleware (merged here)
const validateDeviceId = (req, res, next) => {
  const { device_id } = req.params;

  if (!device_id || device_id === "undefined" || device_id === "null") {
    return res.status(400).json({
      error: "Invalid device_id parameter",
      message: "device_id is required and must be a valid string",
    });
  }

  next();
};

// ─── PUBLIC ROUTES ─────────────────────────────────────────────
router.post("/login", controller.login);

// ─── PROTECTED ROUTES ─────────────────────────────────────────
// FIXED: This should call getDevices, not getDevice
router.get("/devices", authenticateToken, controller.getDevices);
router.get(
  "/all-daily-runtime",
//   authenticateToken,
  controller.getAllDailyRuntime,
);

router.post("/register", authenticateToken, controller.registerDevice);

// ─── ROUTES WITH device_id VALIDATION ─────────────────────────
router.get(
  "/device/:device_id",
  authenticateToken,
  validateDeviceId,
  controller.getDevice,
);

router.put(
  "/device/:device_id/threshold",
//   authenticateToken,
  validateDeviceId,
  controller.updateDeviceThreshold,
);
router.get('/threshold/:device_id', validateDeviceId, controller.getThreshold);
router.get(
  "/runtime/:device_id",
//   authenticateToken,
  validateDeviceId,
  controller.getRuntime,
);

router.get(
  "/cycles/:device_id",
//   authenticateToken,
  validateDeviceId,
  controller.getCycles,
);

router.get(
  "/daily-summary/:device_id",
//   authenticateToken,
  validateDeviceId,
  controller.getDailySummary,
);

module.exports = router;
// //controller.js 


const pool = require('./config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ─── AUTHENTICATION ──────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'mySuperSecretKey123',
            { expiresIn: '96h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── IN-MEMORY DEVICE STATE ───────────────────────────────────────────────────
const deviceState = {};
const deviceThresholdCache = {}; // Cache for device thresholds

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
    if (seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}



function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function secondsSinceMidnight() {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}
// Add these functions after secondsSinceMidnight() and before getDeviceThreshold()

// ─── DATABASE QUERY FUNCTIONS ──────────────────────────────────────────────────
async function queryRuntimeForDate(device_id, date) {
    const [rows] = await pool.execute(
        `SELECT total_runtime FROM runtime WHERE device_id = ? AND date = ?`,
        [device_id, date]
    );
    const seconds = rows[0]?.total_runtime || 0;
    return seconds;
}

async function queryCyclesForDate(device_id, date) {
    const [logs] = await pool.execute(
        `SELECT timestamp, status FROM machine_logs
         WHERE device_id = ? AND DATE(timestamp) = ?
         ORDER BY timestamp ASC`,
        [device_id, date]
    );

    const cycles = [];
    let cycleStart = null;
    let cycleNum = 0;
    let totalRuntime = 0;

    for (const log of logs) {
        if (log.status === 'ON' && !cycleStart) {
            cycleStart = new Date(log.timestamp);
            cycleNum++;
        } else if (log.status === 'OFF' && cycleStart) {
            const endTime = new Date(log.timestamp);
            const dur = Math.floor((endTime - cycleStart) / 1000);
            totalRuntime += dur;

            const startSec = cycleStart.getHours() * 3600 + cycleStart.getMinutes() * 60 + cycleStart.getSeconds();
            cycles.push({
                cycleNumber:      cycleNum,
                startTime:        cycleStart.toLocaleTimeString(),
                endTime:          endTime.toLocaleTimeString(),
                durationSeconds:  dur,
                durationFormatted: formatDuration(dur),
                startPercent:     ((startSec / 86400) * 100).toFixed(3),
                widthPercent:     ((dur / 86400) * 100).toFixed(4),
                isRunning:        false
            });
            cycleStart = null;
        }
    }

    // Currently running cycle
    if (cycleStart) {
        const now = new Date();
        const dur = Math.floor((now - cycleStart) / 1000);
        totalRuntime += dur;
        const startSec = cycleStart.getHours() * 3600 + cycleStart.getMinutes() * 60 + cycleStart.getSeconds();
        cycles.push({
            cycleNumber:      cycleNum,
            startTime:        cycleStart.toLocaleTimeString(),
            endTime:          null,
            durationSeconds:  dur,
            durationFormatted: formatDuration(dur) + ' (running)',
            startPercent:     ((startSec / 86400) * 100).toFixed(3),
            widthPercent:     ((dur / 86400) * 100).toFixed(4),
            isRunning:        true
        });
    }

    // Downtime calculation
    const isToday = date === todayStr();
    const totalSecondsInDay = isToday ? secondsSinceMidnight() : 86400;
    const downtime = Math.max(0, totalSecondsInDay - totalRuntime);

    return {
        totalCycles:          cycleNum,
        totalRuntime,
        totalRuntimeFormatted: formatDuration(totalRuntime),
        downtime,
        downtimeFormatted:    formatDuration(downtime),
        efficiencyPercent:    totalSecondsInDay > 0
                                ? ((totalRuntime / totalSecondsInDay) * 100).toFixed(1)
                                : '0.0',
        totalSecondsInDay,
        cycles
    };
}

async function queryDailySummary(device_id, startDate, endDate) {
    const [runtimeRows] = await pool.execute(
        `SELECT date, total_runtime FROM runtime
         WHERE device_id = ? AND date BETWEEN ? AND ?`,
        [device_id, startDate, endDate]
    );

    const [cycleRows] = await pool.execute(
        `SELECT DATE(timestamp) as date, COUNT(*) as cycle_count
         FROM machine_logs
         WHERE device_id = ? AND status = 'ON' AND DATE(timestamp) BETWEEN ? AND ?
         GROUP BY DATE(timestamp)`,
        [device_id, startDate, endDate]
    );

    const runtimeMap = {};
    runtimeRows.forEach(r => { runtimeMap[r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date] = r.total_runtime; });

    const cycleMap = {};
    cycleRows.forEach(r => { cycleMap[r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date] = r.cycle_count; });

    const result = [];
    const cur = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (cur <= end) {
        const ds = cur.toISOString().split('T')[0];
        const runtime = runtimeMap[ds] || 0;
        result.push({
            date:              ds,
            runtime_seconds:   runtime,
            runtime_hours:     (runtime / 3600).toFixed(2),
            runtime_formatted: formatDuration(runtime),
            cycle_count:       cycleMap[ds] || 0,
            efficiency_percent: ((runtime / 86400) * 100).toFixed(1)
        });
        cur.setDate(cur.getDate() + 1);
    }

    return result;
}

// Get device threshold from database with caching
async function getDeviceThreshold(device_id) {
    // Check cache first
    if (deviceThresholdCache[device_id] && 
        (Date.now() - deviceThresholdCache[device_id].timestamp < 60000)) { // Cache for 1 minute
        return deviceThresholdCache[device_id].threshold;
    }

    try {
        const [rows] = await pool.execute(
            'SELECT current_threshold FROM devices WHERE device_id = ?',
            [device_id]
        );
        
        const threshold = rows[0]?.current_threshold || 0.5;
        
        // Update cache
        deviceThresholdCache[device_id] = {
            threshold: threshold,
            timestamp: Date.now()
        };
        
        return threshold;
    } catch (err) {
        console.error(`Error getting threshold for ${device_id}:`, err);
        return 0.5; // Default threshold
    }
}

// ─── CORE MQTT PROCESSOR ──────────────────────────────────────────────────────
const processRuntime = async (data) => {
    const { device_id, current, status: providedStatus } = data;
    const now = new Date();

    console.log('\n========== RUNTIME CALCULATION ==========');
    console.log(`Device: ${device_id} | Current: ${current}A | Time: ${now.toLocaleString()}`);

    // Get device-specific threshold
    const currentThreshold = await getDeviceThreshold(device_id);
    let finalStatus = providedStatus;

    // If no explicit status provided, infer based on device threshold
    if (!finalStatus && current !== undefined) {
        const inferred = current > currentThreshold ? 'ON' : 'OFF';
        
        // Initialize last status if needed
        if (!deviceState[device_id]) {
            deviceState[device_id] = {
                lastStatus: inferred,
                startTime: null,
                lastUpdate: now,
                todayCycles: 0,
                lastCurrent: current
            };
        }
        
        // Only update if status changed
        if (deviceState[device_id].lastStatus === inferred) {
            console.log(`   ⏭️ Status unchanged (${inferred}) - Threshold: ${currentThreshold}A, Current: ${current}A`);
            // Still update lastCurrent for monitoring
            deviceState[device_id].lastCurrent = current;
            return { success: true, skipped: true };
        }
        
        finalStatus = inferred;
        console.log(`   📊 Inferred: ${finalStatus} (Threshold: ${currentThreshold}A, Current: ${current}A)`);
    }

    if (!finalStatus || (finalStatus !== 'ON' && finalStatus !== 'OFF')) {
        console.error(`❌ Invalid status: ${finalStatus}`);
        return { success: false, error: 'Invalid status' };
    }

    if (!deviceState[device_id]) {
        deviceState[device_id] = {
            lastStatus: 'OFF',
            startTime: null,
            lastUpdate: now,
            todayCycles: 0,
            lastCurrent: current || 0,
            currentThreshold: currentThreshold
        };
    }

    const state = deviceState[device_id];
    state.currentThreshold = currentThreshold;
    
    if (current !== undefined) {
        state.lastCurrent = current;
    }

    // Save to machine_logs
    try {
        await pool.execute(
            `INSERT INTO machine_logs (device_id, current, status, timestamp, current_threshold) 
             VALUES (?, ?, ?, ?, ?)`,
            [device_id, current || 0, finalStatus, now, currentThreshold]
        );
        console.log(`✅ Log saved: ${device_id} – ${finalStatus} (Threshold: ${currentThreshold}A)`);
    } catch (err) {
        console.error('❌ Log save error:', err);
    }

    // Machine STARTED (OFF → ON)
    if (finalStatus === 'ON' && state.lastStatus === 'OFF') {
        state.startTime = now;
        console.log(`🟢 STARTED at ${now.toLocaleTimeString()} | Cycle #${state.todayCycles + 1} | Threshold: ${currentThreshold}A`);
    }

    // Machine STOPPED (ON → OFF)
    if (finalStatus === 'OFF' && state.lastStatus === 'ON' && state.startTime) {
        const runtimeSeconds = Math.floor((now - state.startTime) / 1000);
        console.log(`🔴 STOPPED at ${now.toLocaleTimeString()} | Runtime: ${runtimeSeconds}s`);

        const today = todayStr();
        try {
            await pool.execute(
                `INSERT INTO runtime (device_id, date, total_runtime)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE total_runtime = total_runtime + ?`,
                [device_id, today, runtimeSeconds, runtimeSeconds]
            );
            console.log(`✅ Runtime saved: +${runtimeSeconds}s for ${today}`);
        } catch (err) {
            console.error('❌ Runtime save error:', err);
        }

        state.todayCycles++;
        state.startTime = null;
    }

    state.lastStatus = finalStatus;
    state.lastUpdate = now;

    console.log(`State: ${state.lastStatus} | Today's Cycles: ${state.todayCycles} | Threshold: ${currentThreshold}A`);
    console.log('==========================================\n');

    return { success: true };
};

// ─── UPDATED REGISTER DEVICE WITH THRESHOLD ────────────────────────────────────
// controller.js — registerDevice
exports.registerDevice = async (req, res) => {
    try {
        const { device_id, machine_name, current_threshold, min_current, max_current } = req.body;

        const minC      = min_current      ?? 0;
        const maxC      = max_current      ?? 99;
        const threshold = current_threshold ?? 0;

        if (threshold < minC || threshold > maxC) {
            return res.status(400).json({
                error: `Threshold must be between ${minC} and ${maxC}`
            });
        }

        await pool.execute(
            `INSERT INTO devices (device_id, machine_name, current_threshold, min_current, max_current)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE machine_name = VALUES(machine_name)`,
            [device_id, machine_name, threshold, minC, maxC]
        );

        res.json({ success: true, device_id, threshold, min_current: minC, max_current: maxC });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── UPDATE DEVICE THRESHOLD ────────────────────────────────────────────────────
// controller.js — updateDeviceThreshold
exports.updateDeviceThreshold = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { current_threshold } = req.body;

        const [rows] = await pool.execute(
            'SELECT min_current, max_current FROM devices WHERE device_id = ?',
            [device_id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Device not found' });

        const { min_current, max_current } = rows[0];

        if (current_threshold < min_current || current_threshold > max_current) {
            return res.status(400).json({
                error: `Threshold must be between ${min_current} and ${max_current}`
            });
        }

        await pool.execute(
            'UPDATE devices SET current_threshold = ? WHERE device_id = ?',
            [current_threshold, device_id]
        );

        res.json({ success: true, device_id, current_threshold });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// ─── GET ALL DEVICES ────────────────────────────────────────────────────────────
exports.getDevices = async (req, res) => {
    try {
        const [devices] = await pool.execute(
            'SELECT * FROM devices ORDER BY created_at DESC'
        );
        
        // Format the response
        const formattedDevices = devices.map(device => ({
            device_id: device.device_id,
            machine_name: device.machine_name,
            current_threshold: device.current_threshold || 0.5,
            min_current: device.min_current || 0,
            max_current: device.max_current || 100,
            created_at: device.created_at,
            updated_at: device.updated_at
        }));
        
        res.json({
            success: true,
            count: formattedDevices.length,
            devices: formattedDevices
        });
    } catch (err) {
        console.error('Error in getDevices:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.getThreshold = async (req, res) => {
    try {
        const { device_id } = req.params;
        const [rows] = await pool.execute(
            'SELECT current_threshold, min_current, max_current FROM devices WHERE device_id = ?',
            [device_id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Device not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── GET DEVICE WITH THRESHOLD INFO ────────────────────────────────────────────
exports.getDevice = async (req, res) => {
    try {
        const { device_id } = req.params;
        
        // Add validation for device_id
        if (!device_id) {
            return res.status(400).json({ error: 'device_id is required' });
        }
        
        const [device] = await pool.execute(
            'SELECT * FROM devices WHERE device_id = ?',
            [device_id]  // Make sure device_id is not undefined
        );
        
        if (device.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        res.json(device[0]);
    } catch (err) {
        console.error('Error in getDevice:', err);
        res.status(500).json({ error: err.message });
    }
};


exports.getRuntime = async (req, res) => {
    try {
        const { device_id } = req.params;
        const date = req.query.date || todayStr();
        const runtimeSeconds = await queryRuntimeForDate(device_id, date);

        const state = deviceState[device_id] || { lastStatus: 'UNKNOWN', todayCycles: 0, startTime: null };
        let currentSessionRuntime = 0;
        if (state.lastStatus === 'ON' && state.startTime) {
            currentSessionRuntime = Math.floor((new Date() - state.startTime) / 1000);
        }

        res.json({
            device_id,
            date,
            runtime_seconds:   runtimeSeconds,
            runtime_formatted: formatDuration(runtimeSeconds),
            runtime_hours:     (runtimeSeconds / 3600).toFixed(2),
            current_status:    state.lastStatus,
            today_cycles:      state.todayCycles,
            current_session:   currentSessionRuntime,
            current_session_formatted: formatDuration(currentSessionRuntime)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCycles = async (req, res) => {
    try {
        const { device_id } = req.params;
        const date = req.query.date || todayStr();
        const data = await queryCyclesForDate(device_id, date);
        res.json({ device_id, date, ...data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDailySummary = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { start, end } = req.query;
        if (!start || !end)
            return res.status(400).json({ error: 'start and end dates required (YYYY-MM-DD)' });

        const data = await queryDailySummary(device_id, start, end);
        res.json({ device_id, start, end, days: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllDailyRuntime = async (req, res) => {
    try {
        const date = req.query.date || todayStr();
        const [rows] = await pool.execute(
            `SELECT d.device_id, d.machine_name,
                    COALESCE(r.total_runtime, 0) AS total_seconds
             FROM devices d
             LEFT JOIN runtime r ON d.device_id = r.device_id AND r.date = ?
             ORDER BY d.device_id`,
            [date]
        );
        res.json(rows.map(row => ({
            ...row,
            runtime_hours:     (row.total_seconds / 3600).toFixed(2),
            runtime_formatted: formatDuration(row.total_seconds),
            efficiency_percent:((row.total_seconds / 86400) * 100).toFixed(1)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Export for MQTT client
exports.processRuntime = processRuntime;.
this above is my backend and below is frontend 
<!-- dashboard.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #070b12; --surface: #0d1526; --card: #111d35;
      --card2: #162240; --border: #1c2e52; --text: #e2e8f0;
      --muted: #5a7098; --accent: #3b82f6; --green: #10b981;
      --red: #ef4444; --yellow: #f59e0b; --purple: #8b5cf6;
    }
    html, body { height: 100%; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; display: flex; flex-direction: column; min-height: 100vh; }

    /* HEADER */
    header { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .hdr { max-width: 1400px; margin: 0 auto; padding: 0 28px; height: 62px; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .logo-svg { width: 34px; height: 34px; }
    .logo-text { font-size: 1.2rem; font-weight: 800; letter-spacing: -.02em; background: linear-gradient(135deg,#3b82f6,#8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .hdr-right { display: flex; align-items: center; gap: 16px; }
    .clock { font-size: .77rem; color: var(--muted); font-variant-numeric: tabular-nums; }
    .live-badge { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.25); font-size: .72rem; font-weight: 700; color: var(--green); }
    .live-dot   { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: livepulse 1.8s infinite; }
    @keyframes livepulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.55)} 50%{opacity:.7;box-shadow:0 0 0 5px rgba(16,185,129,0)} }

    /* MAIN */
    main { flex: 1; max-width: 1400px; margin: 0 auto; padding: 32px 28px; width: 100%; }

    /* PAGE HEAD */
    .pg-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 14px; }
    .pg-head h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -.025em; }
    .pg-head h1 span { color: var(--accent); }
    .pg-hint { font-size: .77rem; color: var(--muted); margin-top: 4px; }

    /* BUTTON */
    .btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; border-radius: 10px; border: none; font-size: .875rem; font-weight: 700; cursor: pointer; transition: all .18s; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(59,130,246,.35); }
    .btn-ghost { background: var(--card2); color: var(--text); border: 1px solid var(--border); }
    .btn-ghost:hover { background: var(--border); }

    /* SUMMARY STRIP */
    .sum-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px,1fr)); gap: 14px; margin-bottom: 28px; }
    .s-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; position: relative; overflow: hidden; }
    .s-card::before { content:''; position: absolute; inset: 0 0 auto 0; height: 3px; border-radius: 14px 14px 0 0; }
    .s-card.blue::before   { background: var(--accent); }
    .s-card.green::before  { background: var(--green); }
    .s-card.red::before    { background: var(--red); }
    .s-card.yellow::before { background: var(--yellow); }
    .s-lbl { font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; }
    .s-val { font-size: 1.9rem; font-weight: 800; margin-top: 6px; line-height: 1; letter-spacing: -.03em; }
    .s-sub { font-size: .7rem; color: var(--muted); margin-top: 4px; }
    .s-card.blue   .s-val { color: var(--accent); }
    .s-card.green  .s-val { color: var(--green); }
    .s-card.red    .s-val { color: var(--red); }
    .s-card.yellow .s-val { color: var(--yellow); }

    /* GRID */
    .dev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(305px,1fr)); gap: 18px; }

    /* DEVICE CARD */
    .d-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform .2s, border-color .2s, box-shadow .2s; }
    .d-card:hover { transform: translateY(-3px); border-color: rgba(59,130,246,.5); box-shadow: 0 10px 40px rgba(59,130,246,.12); }

    .dc-top { padding: 20px 20px 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .dc-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.2); }
    .dc-info { flex: 1; margin-top: 2px; }
    .dc-name { font-size: 1rem; font-weight: 700; }
    .dc-id   { font-size: .7rem; color: var(--muted); margin-top: 3px; }

    .sbadge { display: flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 20px; font-size: .72rem; font-weight: 800; white-space: nowrap; flex-shrink: 0; }
    .sbadge .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .sbadge.on  { background: rgba(16,185,129,.12); color: var(--green); border: 1px solid rgba(16,185,129,.3); }
    .sbadge.off { background: rgba(90,112,152,.1);  color: var(--muted);  border: 1px solid rgba(90,112,152,.2); }
    .sbadge.on .dot { animation: livepulse 1.6s infinite; }

    .dc-sep { height: 1px; background: var(--border); }
    .dc-metrics { display: grid; grid-template-columns: repeat(3,1fr); padding: 14px 20px; }
    .dc-m { text-align: center; }
    .dc-m + .dc-m { border-left: 1px solid var(--border); }
    .dc-ml { font-size: .65rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
    .dc-mv { font-size: 1.05rem; font-weight: 700; margin-top: 4px; }

    .dc-eff { padding: 0 20px 16px; }
    .eff-row { display: flex; justify-content: space-between; font-size: .68rem; color: var(--muted); margin-bottom: 5px; }
    .eff-track { height: 5px; background: var(--card2); border-radius: 10px; overflow: hidden; }
    .eff-fill  { height: 100%; border-radius: 10px; background: linear-gradient(90deg, var(--accent), var(--green)); transition: width .6s ease; }

    .dc-foot { margin-top: auto; padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
    .view-lnk { font-size: .8rem; font-weight: 700; color: var(--accent); text-decoration: none; display: flex; align-items: center; gap: 4px; transition: gap .18s; }
    .view-lnk:hover { gap: 9px; }

    /* SKELETON */
    .skel { background: linear-gradient(90deg, var(--card2) 25%, var(--border) 50%, var(--card2) 75%); background-size: 200% 100%; animation: sk 1.3s infinite; border-radius: 14px; }
    @keyframes sk { from{background-position:200% 0} to{background-position:-200% 0} }

    /* EMPTY */
    .empty { grid-column:1/-1; text-align:center; padding:70px 20px; }
    .empty .ei { font-size:3.5rem; margin-bottom:14px; }
    .empty p   { color:var(--muted); margin-bottom:20px; }

    /* MODAL */
    .modal-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(6px); z-index:200; align-items:center; justify-content:center; }
    .modal-bg.open { display:flex; }
    .modal { background:var(--card); border:1px solid var(--border); border-radius:18px; padding:30px; width:100%; max-width:420px; box-shadow:0 24px 60px rgba(0,0,0,.5); }
    .modal-hd { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
    .modal-hd h2 { font-size:1.15rem; font-weight:800; }
    .mc-btn { background:none; border:none; color:var(--muted); font-size:1.3rem; cursor:pointer; padding:2px 6px; border-radius:6px; line-height:1; transition:background .15s; }
    .mc-btn:hover { background:var(--card2); color:var(--text); }
    .fgrp { margin-bottom:16px; }
    .fgrp label { display:block; font-size:.77rem; font-weight:600; color:var(--muted); margin-bottom:7px; text-transform:uppercase; letter-spacing:.04em; }
    .fgrp input { width:100%; padding:11px 14px; background:var(--surface); border:1px solid var(--border); border-radius:10px; color:var(--text); font-size:.9rem; outline:none; transition:border-color .18s, box-shadow .18s; }
    .fgrp input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(59,130,246,.15); }
    .modal-btns { display:flex; gap:10px; margin-top:22px; }
    .modal-btns .btn { flex:1; justify-content:center; }
    .flash { font-size:.8rem; margin-top:10px; padding:9px 13px; border-radius:8px; }
    .flash.ok  { background:rgba(16,185,129,.1); color:var(--green); border:1px solid rgba(16,185,129,.25); }
    .flash.err { background:rgba(239,68,68,.1);  color:var(--red);   border:1px solid rgba(239,68,68,.25); }

    /* FOOTER */
    footer { text-align:center; padding:18px; font-size:.72rem; color:var(--muted); border-top:1px solid var(--border); }

    @media(max-width:600px){
      .hdr { padding:0 16px; }
      main { padding:20px 16px; }
      .sum-strip { grid-template-columns:1fr 1fr; }
      .pg-head h1 { font-size:1.3rem; }
    }
  </style>
</head>
<body>

<!-- HEADER -->
<header>
  <div class="hdr">
    <a href="/" class="logo">
      <svg class="logo-svg" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="34" height="34" rx="9" fill="url(#lg)"/>
        <path d="M8 22l4.5-7 4 4.5 4.5-9 4 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="25.5" cy="10" r="2.8" fill="#10b981"/>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
      </svg>
      <span class="logo-text">Machine Runtime</span>
    </a>
    <div class="hdr-right">
      <span class="clock" id="clock"></span>
      <div class="live-badge"><span class="live-dot"></span>LIVE</div>
    </div>
  </div>
</header>

<!-- MAIN -->
<main>
  <div class="pg-head">
    <div>
      <h1>All <span>Devices</span></h1>
      <div class="pg-hint" id="last-ref">–</div>
    </div>
     <button class="btn btn-primary" onclick="openModal()">
    <!-- <button class="btn btn-primary"> -->
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      Register Device
    </button>
  </div>

  <div class="sum-strip">
    <div class="s-card blue">  <div class="s-lbl">Total Devices</div><div class="s-val" id="st">–</div></div>
    <div class="s-card green"> <div class="s-lbl">Online Now</div>   <div class="s-val" id="son">–</div></div>
    <div class="s-card red">   <div class="s-lbl">Offline Now</div>  <div class="s-val" id="soff">–</div></div>
    <div class="s-card yellow"><div class="s-lbl">Total Runtime Today</div><div class="s-val" id="srt">–</div><div class="s-sub">all devices</div></div>
  </div>

  <div class="dev-grid" id="dev-grid">
    <div class="skel" style="height:235px"></div>
    <div class="skel" style="height:235px"></div>
    <div class="skel" style="height:235px"></div>
  </div>
</main>

<!-- FOOTER -->
<footer>Machine Run Time Track  Dashboard &nbsp;·&nbsp; <script>document.write(new Date().getFullYear())</script></footer>

<!-- MODAL -->
<div class="modal-bg" id="mbg">
  <div class="modal">
    <div class="modal-hd">
      <h2>⚙️ Register Device</h2>
      <button class="mc-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="fgrp"><label>Device ID</label><input id="rid" placeholder="e.g. 1234"></div>
    <div class="fgrp"><label>Machine Name</label><input id="rname" placeholder="e.g. Pump Motor A"></div>
    <div id="rfl"></div>
    <div class="modal-btns">
      <button class="btn btn-ghost"   onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doRegister()">Register</button>
    </div>
  </div>
</div>

<script>
  const API = '/api';

  /* Clock */
  (function tick(){
    document.getElementById('clock').textContent = new Date().toLocaleString('en-IN',
      { weekday:'short', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setTimeout(tick, 1000);
  })();

  /* Modal */
  function openModal()  { document.getElementById('mbg').classList.add('open'); document.getElementById('rid').focus(); }
  function closeModal() { document.getElementById('mbg').classList.remove('open'); document.getElementById('rfl').innerHTML = ''; }
  document.getElementById('mbg').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeModal(); });

  async function doRegister() {
    var id   = document.getElementById('rid').value.trim();
    var name = document.getElementById('rname').value.trim();
    var fl   = document.getElementById('rfl');
    if (!id || !name) { fl.innerHTML = '<div class="flash err">Both fields are required.</div>'; return; }
    try {
      var res  = await fetch(API + '/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ device_id: id, machine_name: name }) });
      var data = await res.json();
      if (res.ok) {
        fl.innerHTML = '<div class="flash ok">✅ Device registered!</div>';
        setTimeout(function() { closeModal(); loadAll(); }, 1100);
      } else {
        fl.innerHTML = '<div class="flash err">❌ ' + data.error + '</div>';
      }
    } catch(e) { fl.innerHTML = '<div class="flash err">❌ Network error.</div>'; }
  }

  /* Load Dashboard */
  async function loadAll() {
    var grid = document.getElementById('dev-grid');
    try {
      var [devRes, rtRes] = await Promise.all([fetch(API + '/devices'), fetch(API + '/all-daily-runtime')]);
      var devices  = await devRes.json();
      var runtimes = await rtRes.json();

      var rtMap = {};
      for (var i = 0; i < runtimes.length; i++) {
        rtMap[runtimes[i].device_id] = runtimes[i];
      }

      var statPromises = [];
      for (var i = 0; i < devices.length; i++) {
        statPromises.push(fetch(API + '/runtime/' + devices[i].device_id).then(function(r) { return r.json(); }));
      }
      var statArr = await Promise.all(statPromises);
      var stMap = {};
      for (var i = 0; i < devices.length; i++) {
        stMap[devices[i].device_id] = statArr[i];
      }

      var on = 0, off = 0, totalSec = 0;
      for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        if (stMap[d.device_id] && stMap[d.device_id].current_status === 'ON') { on++; } else { off++; }
        totalSec += rtMap[d.device_id] ? rtMap[d.device_id].total_seconds : 0;
      }

      document.getElementById('st').textContent   = devices.length;
      document.getElementById('son').textContent  = on;
      document.getElementById('soff').textContent = off;
      document.getElementById('srt').textContent  = (totalSec / 3600).toFixed(1) + 'h';
      document.getElementById('last-ref').textContent = 'Last refreshed: ' + new Date().toLocaleTimeString('en-IN') + ' · auto every 30s';

      if (!devices.length) {
        grid.innerHTML = '<div class="empty"><div class="ei">🏭</div><p>No devices registered yet.</p><button class="btn btn-primary" onclick="openModal()">Register First Device</button></div>';
        return;
      }

      var html = '';
      for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        var st  = stMap[d.device_id] || {};
        var rt  = rtMap[d.device_id] || { total_seconds: 0, runtime_formatted: '0s', efficiency_percent: '0.0' };
        var isOn = st.current_status === 'ON';
        var eff  = parseFloat(rt.efficiency_percent || 0);
        html += '<div class="d-card">' +
          '<div class="dc-top">' +
            '<div class="dc-icon">⚙️</div>' +
            '<div class="dc-info">' +
              '<div class="dc-name">' + escapeHtml(d.machine_name) + '</div>' +
              '<div class="dc-id">ID: ' + escapeHtml(d.device_id) + '</div>' +
            '</div>' +
            '<div class="sbadge ' + (isOn ? 'on' : 'off') + '">' +
              '<span class="dot"></span>' + (isOn ? 'RUNNING' : 'OFFLINE') +
            '</div>' +
          '</div>' +
          '<div class="dc-sep"></div>' +
          '<div class="dc-metrics">' +
            '<div class="dc-m"><div class="dc-ml">Runtime</div><div class="dc-mv" style="color:var(--green)">' + (rt.runtime_formatted || '0s') + '</div></div>' +
            '<div class="dc-m"><div class="dc-ml">Cycles</div><div class="dc-mv" style="color:var(--accent)">' + (st.today_cycles || '–') + '</div></div>' +
            '<div class="dc-m"><div class="dc-ml">Efficiency</div><div class="dc-mv" style="color:var(--yellow)">' + eff.toFixed(1) + '%</div></div>' +
          '</div>' +
          '<div class="dc-eff">' +
            '<div class="eff-row"><span>Daily Efficiency</span><span>' + eff.toFixed(1) + '%</span></div>' +
            '<div class="eff-track"><div class="eff-fill" style="width:' + Math.min(100, eff) + '%"></div></div>' +
          '</div>' +
          '<div class="dc-foot">' +
            '<a href="/device/' + encodeURIComponent(d.device_id) + '" class="view-lnk">View Details →</a>' +
          '</div>' +
        '</div>';
      }
      grid.innerHTML = html;

    } catch(e) {
      grid.innerHTML = '<div class="empty"><div class="ei">⚠️</div><p>Failed to load. Check server.</p></div>';
      console.error(e);
    }
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  loadAll();
  setInterval(loadAll, 30000);
</script>
</body>
</html><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #070b12; --surface: #0d1526; --card: #111d35;
      --card2: #162240; --border: #1c2e52; --text: #e2e8f0;
      --muted: #5a7098; --accent: #3b82f6; --green: #10b981;
      --red: #ef4444; --yellow: #f59e0b; --purple: #8b5cf6;
    }
    html, body { height: 100%; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; display: flex; flex-direction: column; min-height: 100vh; }

    /* HEADER */
    header { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .hdr { max-width: 1400px; margin: 0 auto; padding: 0 28px; height: 62px; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .logo-svg { width: 34px; height: 34px; }
    .logo-text { font-size: 1.2rem; font-weight: 800; letter-spacing: -.02em; background: linear-gradient(135deg,#3b82f6,#8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .hdr-right { display: flex; align-items: center; gap: 16px; }
    .clock { font-size: .77rem; color: var(--muted); font-variant-numeric: tabular-nums; }
    .live-badge { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.25); font-size: .72rem; font-weight: 700; color: var(--green); }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: lp 1.8s infinite; }
    @keyframes lp { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.55)} 50%{opacity:.7;box-shadow:0 0 0 5px rgba(16,185,129,0)} }

    /* MAIN */
    main { flex: 1; max-width: 1400px; margin: 0 auto; padding: 28px 28px; width: 100%; }

    /* BACK */
    .back { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); text-decoration: none; font-size: .875rem; margin-bottom: 18px; transition: color .18s; }
    .back:hover { color: var(--accent); }

    /* HERO */
    .hero { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px 28px; margin-bottom: 26px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
    .hero-name { font-size: 1.5rem; font-weight: 800; letter-spacing: -.025em; }
    .hero-sub  { font-size: .78rem; color: var(--muted); margin-top: 4px; }
    .hero-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .big-status { display: flex; align-items: center; gap: 9px; padding: 10px 20px; border-radius: 12px; font-size: .95rem; font-weight: 800; }
    .big-status .dot { width: 10px; height: 10px; border-radius: 50%; background: currentColor; }
    .big-status.on  { background: rgba(16,185,129,.12); color: var(--green); border: 1px solid rgba(16,185,129,.3); }
    .big-status.off { background: rgba(90,112,152,.1);  color: var(--muted);  border: 1px solid rgba(90,112,152,.2); }
    .big-status.on .dot { animation: lp 1.5s infinite; }
    .session-pill { font-size: .78rem; color: var(--muted); background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 6px 14px; }
    .session-pill span { color: var(--green); font-weight: 700; }

    /* TABS */
    .tabs { display: flex; gap: 3px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 5px; margin-bottom: 24px; width: fit-content; }
    .tab { padding: 9px 26px; border-radius: 8px; border: none; cursor: pointer; font-size: .875rem; font-weight: 700; color: var(--muted); background: transparent; transition: all .18s; }
    .tab.active { background: var(--accent); color: #fff; }
    .tab:not(.active):hover { background: var(--card2); color: var(--text); }
    .panel { display: none; }
    .panel.active { display: block; }

    /* DATE CONTROLS */
    .dctl { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .dctl label { font-size: .78rem; color: var(--muted); }
    .dinput { padding: 8px 14px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: .875rem; outline: none; cursor: pointer; transition: border-color .18s; }
    .dinput:focus { border-color: var(--accent); }
    .nbtn { padding: 8px 14px; background: var(--card2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); cursor: pointer; font-size: .875rem; transition: background .15s; font-weight: 600; }
    .nbtn:hover { background: var(--border); }
    .rng-label { font-size: .875rem; font-weight: 700; min-width: 170px; text-align: center; }

    /* STAT CARDS */
    .srow { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px,1fr)); gap: 13px; margin-bottom: 22px; }
    .sc { background: var(--card); border: 1px solid var(--border); border-radius: 13px; padding: 16px 18px; }
    .sc-lbl { font-size: .68rem; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; }
    .sc-val { font-size: 1.55rem; font-weight: 800; margin-top: 5px; line-height: 1; letter-spacing: -.025em; }
    .sc-sub { font-size: .68rem; color: var(--muted); margin-top: 4px; }

    /* 24H TIMELINE */
    .tl-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 22px; }
    .tl-title { font-size: .78rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
    .tl-hours { display: flex; margin-bottom: 6px; overflow: hidden; }
    .tl-hours span { flex: 1; font-size: .62rem; color: var(--muted); }
    .tl-bar {
      position: relative; height: 40px; background: rgba(239,68,68,.07);
      border-radius: 8px; overflow: hidden; border: 1px solid rgba(239,68,68,.18);
    }
    .tl-seg {
      position: absolute; top: 0; height: 100%; background: var(--green);
      border-radius: 3px; opacity: .9; cursor: pointer; transition: opacity .18s;
    }
    .tl-seg:hover { opacity: 1; }
    .tl-seg.running { background: linear-gradient(90deg, var(--green), var(--yellow)); animation: runpulse 2s infinite; }
    @keyframes runpulse { 0%,100%{opacity:.9} 50%{opacity:.65} }
    .tl-legend { display: flex; gap: 16px; margin-top: 9px; }
    .tl-li { display: flex; align-items: center; gap: 5px; font-size: .7rem; color: var(--muted); }
    .tl-dot { width: 10px; height: 10px; border-radius: 2px; }

    /* TABLE */
    .tbl-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .tbl-hd { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .tbl-hd h3 { font-size: .88rem; font-weight: 800; }
    .cnt-badge { font-size: .72rem; padding: 4px 10px; background: rgba(59,130,246,.1); color: var(--accent); border-radius: 20px; border: 1px solid rgba(59,130,246,.25); font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 16px; font-size: .68rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); text-align: left; border-bottom: 1px solid var(--border); background: var(--card2); }
    tbody td { padding: 11px 16px; font-size: .84rem; border-bottom: 1px solid rgba(28,46,82,.5); }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: var(--card2); }
    .run-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700;background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.25); }

    /* WEEK BAR CHART */
    .wk-chart { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px; margin-bottom: 22px; }
    .wk-title { font-size: .78rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 20px; }
    .wk-bars { display: grid; grid-template-columns: repeat(7,1fr); gap: 10px; height: 180px; align-items: flex-end; }
    .wk-col { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
    .wk-barwrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .wk-bar {
      width: 100%; border-radius: 6px 6px 0 0; min-height: 4px;
      background: linear-gradient(180deg, var(--accent), rgba(59,130,246,.3));
      cursor: pointer; transition: background .18s; position: relative;
    }
    .wk-bar.today { background: linear-gradient(180deg, var(--green), rgba(16,185,129,.25)); }
    .wk-bar:hover { filter: brightness(1.2); }
    .wk-tip {
      display: none; position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%);
      background: var(--card2); border: 1px solid var(--border); border-radius: 7px;
      padding: 7px 11px; font-size: .7rem; white-space: nowrap; z-index: 10; pointer-events: none;
      line-height: 1.5;
    }
    .wk-bar:hover .wk-tip { display: block; }
    .wk-day { font-size: .68rem; color: var(--muted); font-weight: 700; }
    .wk-hrs { font-size: .62rem; color: var(--accent); }
    .wk-bar.today ~ .wk-hrs { color: var(--green); }

    /* WEEK TABLE */
    .wk-tbl { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 22px; }

    /* MONTH CALENDAR */
    .cal-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .cal-dows { display: grid; grid-template-columns: repeat(7,1fr); }
    .cal-dow { text-align: center; padding: 10px 4px; font-size: .68rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--border); background: var(--card2); }
    .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 1px; background: var(--border); }
    .cal-cell { background: var(--card); min-height: 82px; padding: 8px; cursor: pointer; transition: background .15s; }
    .cal-cell:hover { background: var(--card2); }
    .cal-cell.empty { background: rgba(7,11,18,.7); cursor: default; }
    .cal-cell.today-c { box-shadow: inset 0 0 0 2px var(--accent); }
    .cal-cell.sel-c { background: rgba(59,130,246,.07); }
    .cal-dn { font-size: .78rem; font-weight: 700; margin-bottom: 4px; }
    .cal-rt { font-size: .7rem; color: var(--green); }
    .cal-cy { font-size: .62rem; color: var(--muted); }
    .cal-heat { height: 4px; border-radius: 2px; margin-top: 5px; overflow: hidden; background: var(--card2); }
    .cal-heat-fill { height: 100%; border-radius: 2px; }

    /* LOADING / EMPTY */
    .ld { display: flex; align-items: center; gap: 10px; padding: 30px 20px; color: var(--muted); font-size: .85rem; }
    .spin { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; flex-shrink: 0; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .no-data { padding: 40px; text-align: center; color: var(--muted); font-size: .875rem; }

    /* FOOTER */
    footer { text-align: center; padding: 18px; font-size: .72rem; color: var(--muted); border-top: 1px solid var(--border); }

    @media(max-width:700px){
      .hdr { padding: 0 16px; }
      main { padding: 18px 16px; }
      .hero { flex-direction: column; align-items: flex-start; }
      .srow { grid-template-columns: 1fr 1fr; }
      .wk-bars { height: 120px; }
      .cal-cell { min-height: 56px; padding: 5px; }
    }
  </style>
</head>
<body>

<!-- ══════ HEADER ══════ -->
<header>
  <div class="hdr">
    <a href="/" class="logo">
      <svg class="logo-svg" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="34" height="34" rx="9" fill="url(#lg2)"/>
        <path d="M8 22l4.5-7 4 4.5 4.5-9 4 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="25.5" cy="10" r="2.8" fill="#10b981"/>
        <defs><linearGradient id="lg2" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
      </svg>
      <span class="logo-text">Machine Runtime</span>
    </a>
    <div class="hdr-right">
      <span class="clock" id="clock"></span>
      <div class="live-badge"><span class="live-dot"></span>LIVE</div>
    </div>
  </div>
</header>

<!-- ══════ MAIN ══════ -->
<main>
  <a href="/" class="back">← All Devices</a>

  <!-- HERO -->
  <div class="hero">
    <div>
      <div class="hero-name" id="hero-name">Loading…</div>
      <div class="hero-sub">Device ID: <strong><%= device_id %></strong></div>
    </div>
    <div class="hero-right">
      <div class="session-pill" id="session-pill">Session: <span>–</span></div>
      <div class="big-status off" id="big-status">
        <span class="dot"></span><span id="status-txt">–</span>
      </div>
    </div>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <button class="tab active" onclick="sw('daily')">📅 Daily</button>
    <button class="tab"        onclick="sw('weekly')">📆 Weekly</button>
    <button class="tab"        onclick="sw('monthly')">🗓️ Monthly</button>
  </div>

  <!-- ══ DAILY ══ -->
  <div class="panel active" id="p-daily">
    <div class="dctl">
      <label>Date</label>
      <input type="date" class="dinput" id="d-date" onchange="loadDaily()">
      <button class="nbtn" onclick="shDay(-1)">◀</button>
      <button class="nbtn" onclick="shDay(1)">▶</button>
      <button class="nbtn" onclick="goToday()">Today</button>
    </div>

    <div class="srow">
      <div class="sc"><div class="sc-lbl">Total Cycles</div>  <div class="sc-val" id="d-cy" style="color:var(--accent)">–</div></div>
      <div class="sc"><div class="sc-lbl">Total Runtime</div> <div class="sc-val" id="d-rt" style="color:var(--green)">–</div><div class="sc-sub" id="d-rt-sub"></div></div>
      <div class="sc"><div class="sc-lbl">Downtime</div>      <div class="sc-val" id="d-dt" style="color:var(--red)">–</div></div>
      <div class="sc"><div class="sc-lbl">Efficiency</div>    <div class="sc-val" id="d-ef" style="color:var(--yellow)">–</div></div>
    </div>

    <!-- Timeline -->
    <div class="tl-wrap">
      <div class="tl-title">
        <span>24-Hour Activity Timeline</span>
        <span id="tl-date" style="font-weight:400;letter-spacing:0"></span>
      </div>
      <div class="tl-hours" id="tl-hrs"></div>
      <div class="tl-bar" id="tl-bar"><div class="ld"><div class="spin"></div>Loading…</div></div>
      <div class="tl-legend">
        <div class="tl-li"><div class="tl-dot" style="background:var(--green)"></div>Machine ON</div>
        <div class="tl-li"><div class="tl-dot" style="background:rgba(239,68,68,.25)"></div>Machine OFF</div>
        <div class="tl-li"><div class="tl-dot" style="background:linear-gradient(90deg,var(--green),var(--yellow))"></div>Currently Running</div>
      </div>
    </div>

    <!-- Cycle Table -->
    <div class="tbl-wrap">
      <div class="tbl-hd">
        <h3>Cycle Details</h3>
        <span class="cnt-badge" id="d-cy-badge">0 cycles</span>
      </div>
      <div id="d-tbl"><div class="ld"><div class="spin"></div>Loading cycles…</div></div>
    </div>
  </div>

  <!-- ══ WEEKLY ══ -->
  <div class="panel" id="p-weekly">
    <div class="dctl">
      <button class="nbtn" onclick="shWk(-1)">◀ Prev</button>
      <div class="rng-label" id="wk-lbl">–</div>
      <button class="nbtn" onclick="shWk(1)">Next ▶</button>
      <button class="nbtn" onclick="goThisWk()">This Week</button>
    </div>

    <div class="wk-chart">
      <div class="wk-title">Daily Runtime (hours)</div>
      <div class="wk-bars" id="wk-bars"><div class="ld" style="grid-column:1/-1"><div class="spin"></div></div></div>
    </div>

    <div class="wk-tbl tbl-wrap">
      <div class="tbl-hd"><h3>Weekly Summary</h3></div>
      <div id="wk-tbl"><div class="ld"><div class="spin"></div></div></div>
    </div>
  </div>

  <!-- ══ MONTHLY ══ -->
  <div class="panel" id="p-monthly">
    <div class="dctl">
      <button class="nbtn" onclick="shMo(-1)">◀ Prev</button>
      <div class="rng-label" id="mo-lbl">–</div>
      <button class="nbtn" onclick="shMo(1)">Next ▶</button>
      <button class="nbtn" onclick="goThisMo()">This Month</button>
    </div>

    <div class="cal-wrap">
      <div class="cal-dows">
        <div class="cal-dow">Sun</div><div class="cal-dow">Mon</div><div class="cal-dow">Tue</div>
        <div class="cal-dow">Wed</div><div class="cal-dow">Thu</div><div class="cal-dow">Fri</div>
        <div class="cal-dow">Sat</div>
      </div>
      <div class="cal-grid" id="cal-grid">
        <div class="ld" style="grid-column:1/-1"><div class="spin"></div>Loading…</div>
      </div>
    </div>
  </div>
</main>

<!-- ══════ FOOTER ══════ -->
<footer>Machine Run Time Track  Dashboard &nbsp;·&nbsp; <script>document.write(new Date().getFullYear())</script></footer>

<!-- ══════ SCRIPT ══════ -->
<script>
  const DID = '<%= device_id %>';
  const API = '/api';

  /* ─ Local date (avoids UTC/IST midnight timezone bug) ─ */
  function localDateStr(d) {
    var dt = d || new Date();
    return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
  }
  const TODAY = localDateStr();

  let dailyDate = TODAY;
  let wkStart   = monOf(new Date());
  let moDate    = new Date();

  /* ─ Pagination ─ */
  var pgCycles = [];
  var pgPage   = 1;
  var PG_SIZE  = 10;

  /* ─ Clock ─ */
  (function tick(){
    document.getElementById('clock').textContent = new Date().toLocaleString('en-IN',
      { weekday:'short', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setTimeout(tick, 1000);
  })();

  /* ─ Tabs ─ */
  const tabs = ['daily','weekly','monthly'];
  function sw(name) {
    document.querySelectorAll('.tab').forEach((b,i) => b.classList.toggle('active', tabs[i] === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('p-' + name).classList.add('active');
    if (name === 'weekly')  loadWeekly();
    if (name === 'monthly') loadMonthly();
  }

  /* ─ Hero ─ */
  async function loadHero() {
    try {
      const [devRes, rtRes] = await Promise.all([fetch(`${API}/devices`), fetch(`${API}/runtime/${DID}`)]);
      const devs = await devRes.json();
      const rt   = await rtRes.json();
      const dev  = devs.find(d => d.device_id == DID);
      if (dev) document.getElementById('hero-name').textContent = dev.machine_name;
      const isOn = rt.current_status === 'ON';
      const el   = document.getElementById('big-status');
      el.className = 'big-status ' + (isOn ? 'on' : 'off');
      document.getElementById('status-txt').textContent = rt.current_status || '–';
      const sp = document.getElementById('session-pill');
      if (isOn && rt.current_session > 0) {
        sp.innerHTML = `Session: <span>${rt.current_session_formatted}</span>`;
      } else {
        sp.innerHTML = 'Session: <span style="color:var(--muted)">Idle</span>';
      }
    } catch(e) {}
  }

  /* ─ DAILY ─ */
  function goToday()  { dailyDate = TODAY; document.getElementById('d-date').value = TODAY; loadDaily(); }
  function shDay(n) {
    var d = new Date(dailyDate + 'T00:00:00');
    d.setDate(d.getDate() + n);
    var target = localDateStr(d);
    if (target > TODAY) return;          // block future only
    dailyDate = target;
    document.getElementById('d-date').value = dailyDate;
    loadDaily();
  }

  async function loadDaily() {
    dailyDate = document.getElementById('d-date').value || TODAY;
    document.getElementById('tl-date').textContent = fmtDateShort(new Date(dailyDate + 'T00:00:00'));
    ['d-cy','d-rt','d-dt','d-ef'].forEach(id => document.getElementById(id).textContent = '–');
    document.getElementById('tl-bar').innerHTML = '<div class="ld"><div class="spin"></div>Loading…</div>';
    document.getElementById('d-tbl').innerHTML  = '<div class="ld"><div class="spin"></div>Loading…</div>';
    try {
      const res  = await fetch(`${API}/cycles/${DID}?date=${dailyDate}`);
      const data = await res.json();
      document.getElementById('d-cy').textContent      = data.totalCycles;
      document.getElementById('d-rt').textContent      = data.totalRuntimeFormatted;
      document.getElementById('d-rt-sub').textContent  = (data.totalRuntime / 3600).toFixed(2) + ' hrs';
      document.getElementById('d-dt').textContent      = data.downtimeFormatted;
      document.getElementById('d-ef').textContent      = data.efficiencyPercent + '%';
      document.getElementById('d-cy-badge').textContent = `${data.totalCycles} cycle${data.totalCycles !== 1 ? 's' : ''}`;
      drawTimeline(data.cycles);
      drawCycleTable(data.cycles);
    } catch(e) {
      document.getElementById('tl-bar').innerHTML = '<div class="no-data">Failed to load timeline.</div>';
      document.getElementById('d-tbl').innerHTML  = '<div class="no-data">Failed to load cycles.</div>';
    }
  }

  function drawTimeline(cycles) {
    /* Hour labels */
    const hrs = document.getElementById('tl-hrs');
    hrs.innerHTML = '';
    for (let i = 0; i <= 24; i += 3) {
      const s = document.createElement('span');
      s.textContent = i + ':00';
      s.style.cssText = 'flex:1;font-size:.6rem;color:var(--muted)';
      if (i === 24) s.style.cssText += ';text-align:right;flex:0 0 auto';
      hrs.appendChild(s);
    }
    const bar = document.getElementById('tl-bar');
    if (!cycles.length) {
      bar.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:.8rem;color:var(--muted)">No activity on this date</div>';
      return;
    }
    bar.innerHTML = cycles.map(c => `
      <div class="tl-seg ${c.isRunning ? 'running' : ''}"
           style="left:${c.startPercent}%;width:${Math.max(0.15, parseFloat(c.widthPercent))}%"
           title="Cycle #${c.cycleNumber}: ${c.startTime} → ${c.endTime || 'running'} (${c.durationFormatted})">
      </div>`).join('');
  }

  /* ─ drawCycleTable: reverse (latest first) then paginate 10/page ─ */
  function drawCycleTable(cycles) {
    pgCycles = cycles.slice().reverse();   // latest cycle at top
    pgPage   = 1;
    renderPage();
  }

  function renderPage() {
    var wrap  = document.getElementById('d-tbl');
    if (!pgCycles.length) {
      wrap.innerHTML = '<div class="no-data">No cycles recorded for this date.</div>';
      return;
    }
    var total = pgCycles.length;
    var pages = Math.ceil(total / PG_SIZE);
    var start = (pgPage - 1) * PG_SIZE;
    var slice = pgCycles.slice(start, start + PG_SIZE);

    var rows = slice.map(function(c, i) {
      // chronologically-next cycle = one before in reversed list
      var prevInSlice = i > 0 ? slice[i-1] : null;
      var gap = (!c.isRunning && prevInSlice && !prevInSlice.isRunning)
                  ? calcGap(c.endTime, prevInSlice.startTime) : '–';
      return '<tr>' +
        '<td style="color:var(--muted)">' + c.cycleNumber + '</td>' +
        '<td style="color:var(--green)">' + c.startTime + '</td>' +
        '<td>' + (c.endTime ? c.endTime : '<span class="run-badge">● Running</span>') + '</td>' +
        '<td style="color:var(--yellow);font-weight:700">' + c.durationFormatted + '</td>' +
        '<td style="color:var(--muted)">' + gap + '</td>' +
      '</tr>';
    }).join('');

    var foot = pages > 1
      ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border);background:var(--card2)">' +
          '<span style="font-size:.75rem;color:var(--muted)">Showing ' + (start+1) + '–' + Math.min(start+PG_SIZE, total) + ' of ' + total + ' cycles (latest first)</span>' +
          '<div style="display:flex;gap:6px">' +
            '<button onclick="changePage(-1)" ' + (pgPage===1?'disabled':'') + ' style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:' + (pgPage===1?'var(--card)':'var(--accent)') + ';color:' + (pgPage===1?'var(--muted)':'#fff') + ';cursor:' + (pgPage===1?'default':'pointer') + ';font-size:.78rem;font-weight:600">◀ Prev</button>' +
            '<span style="padding:5px 12px;font-size:.78rem;color:var(--muted)">' + pgPage + ' / ' + pages + '</span>' +
            '<button onclick="changePage(1)"  ' + (pgPage===pages?'disabled':'') + ' style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:' + (pgPage===pages?'var(--card)':'var(--accent)') + ';color:' + (pgPage===pages?'var(--muted)':'#fff') + ';cursor:' + (pgPage===pages?'default':'pointer') + ';font-size:.78rem;font-weight:600">Next ▶</button>' +
          '</div>' +
        '</div>'
      : '<div style="padding:10px 16px;border-top:1px solid var(--border);font-size:.75rem;color:var(--muted)">' + total + ' cycle' + (total!==1?'s':'') + ' · latest first</div>';

    wrap.innerHTML =
      '<table><thead><tr><th>#</th><th>Start Time</th><th>End Time</th><th>ON Duration</th><th>OFF Gap (next)</th></tr></thead><tbody>' + rows + '</tbody></table>' + foot;
  }

  function changePage(dir) {
    var pages = Math.ceil(pgCycles.length / PG_SIZE);
    pgPage = Math.max(1, Math.min(pages, pgPage + dir));
    renderPage();
    document.getElementById('d-tbl').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function calcGap(endStr, nextStr) {
    try {
      const b = TODAY;
      const diff = Math.floor((new Date(`${b} ${nextStr}`) - new Date(`${b} ${endStr}`)) / 1000);
      return isNaN(diff) || diff < 0 ? '–' : fmtSec(diff);
    } catch { return '–'; }
  }

  /* ─ WEEKLY ─ */
  function monOf(d) {
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(new Date(d).setDate(diff));
  }
  function sunOf(mon) { return new Date(new Date(mon).setDate(mon.getDate() + 6)); }
  function goThisWk() { wkStart = monOf(new Date()); loadWeekly(); }
  function shWk(n)    { wkStart = new Date(wkStart.setDate(wkStart.getDate() + n * 7)); loadWeekly(); }

  async function loadWeekly() {
    const end     = sunOf(new Date(wkStart));
    const startS  = ds(wkStart), endS = ds(end);
    document.getElementById('wk-lbl').textContent = `${fmtDateShort(wkStart)} – ${fmtDateShort(end)}`;
    document.getElementById('wk-bars').innerHTML = '<div class="ld" style="grid-column:1/-1"><div class="spin"></div></div>';
    document.getElementById('wk-tbl').innerHTML  = '<div class="ld"><div class="spin"></div></div>';
    try {
      const res  = await fetch(`${API}/daily-summary/${DID}?start=${startS}&end=${endS}`);
      const data = await res.json();
      drawWkBars(data.days);
      drawWkTable(data.days);
    } catch {
      document.getElementById('wk-bars').innerHTML = '<div class="no-data" style="grid-column:1/-1">Failed to load.</div>';
    }
  }

  function drawWkBars(days) {
    const maxSec = Math.max(...days.map(d => d.runtime_seconds), 1);
    document.getElementById('wk-bars').innerHTML = days.map(d => {
      const pct  = (d.runtime_seconds / maxSec * 100).toFixed(1);
      const dObj = new Date(d.date + 'T00:00:00');
      const dayN = dObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayD = dObj.getDate();
      const isT  = d.date === TODAY;
      return `<div class="wk-col">
        <div class="wk-barwrap">
          <div class="wk-bar ${isT ? 'today' : ''}" style="height:${Math.max(2, parseFloat(pct))}%"
               onclick="jumpToDay('${d.date}')">
            <div class="wk-tip">${d.date}<br>Runtime: ${d.runtime_formatted}<br>Cycles: ${d.cycle_count}<br>Eff: ${d.efficiency_percent}%</div>
          </div>
        </div>
        <div class="wk-day">${dayN} ${dayD}</div>
        <div class="wk-hrs" style="color:${isT ? 'var(--green)' : 'var(--accent)'}">${d.runtime_hours}h</div>
      </div>`;
    }).join('');
  }

  function drawWkTable(days) {
    const totSec = days.reduce((a, d) => a + d.runtime_seconds, 0);
    const totCy  = days.reduce((a, d) => a + d.cycle_count, 0);
    const rows   = days.map(d => {
      const dow  = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', day:'2-digit', month:'short' });
      const col  = heatColor(parseFloat(d.efficiency_percent));
      return `<tr>
        <td>${dow}</td>
        <td style="color:var(--accent)">${d.cycle_count}</td>
        <td style="color:var(--green)">${d.runtime_formatted}</td>
        <td>${d.runtime_hours}h</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:var(--card2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${d.efficiency_percent}%;background:${col};border-radius:3px"></div>
            </div>
            <span style="font-size:.72rem;color:var(--muted);min-width:36px">${d.efficiency_percent}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
    document.getElementById('wk-tbl').innerHTML = `<table>
      <thead><tr><th>Day</th><th>Cycles</th><th>Runtime</th><th>Hours</th><th>Efficiency</th></tr></thead>
      <tbody>
        ${rows}
        <tr style="background:var(--card2);font-weight:700">
          <td>Total / Avg</td>
          <td style="color:var(--accent)">${totCy}</td>
          <td style="color:var(--green)">${fmtSec(totSec)}</td>
          <td>${(totSec/3600).toFixed(2)}h</td>
          <td style="color:var(--muted)">–</td>
        </tr>
      </tbody>
    </table>`;
  }

  function jumpToDay(date) { dailyDate = date; document.getElementById('d-date').value = date; sw('daily'); }

  /* ─ MONTHLY ─ */
  function goThisMo() { moDate = new Date(); loadMonthly(); }
  function shMo(n)    { moDate = new Date(moDate.getFullYear(), moDate.getMonth() + n, 1); loadMonthly(); }

  async function loadMonthly() {
    const y = moDate.getFullYear(), m = moDate.getMonth();
    document.getElementById('mo-lbl').textContent =
      moDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const startS = `${y}-${pad(m+1)}-01`;
    const last   = new Date(y, m+1, 0).getDate();
    const endS   = `${y}-${pad(m+1)}-${pad(last)}`;
    document.getElementById('cal-grid').innerHTML = '<div class="ld" style="grid-column:1/-1"><div class="spin"></div>Loading…</div>';
    try {
      const res  = await fetch(`${API}/daily-summary/${DID}?start=${startS}&end=${endS}`);
      const data = await res.json();
      drawCal(y, m, data.days);
    } catch {
      document.getElementById('cal-grid').innerHTML = '<div class="no-data" style="grid-column:1/-1">Failed to load.</div>';
    }
  }

  function drawCal(y, m, days) {
    const mp   = {};
    days.forEach(d => { mp[d.date] = d; });
    const firstDow = new Date(y, m, 1).getDay();
    const lastDay  = new Date(y, m+1, 0).getDate();
    let html = '';
    for (let i = 0; i < firstDow; i++) html += '<div class="cal-cell empty"><div class="cal-dn"></div></div>';
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${y}-${pad(m+1)}-${pad(d)}`;
      const info    = mp[dateStr] || { runtime_seconds:0, cycle_count:0, runtime_formatted:'–', efficiency_percent:'0.0' };
      const isT     = dateStr === TODAY;
      const col     = heatColor(parseFloat(info.efficiency_percent));
      html += `
        <div class="cal-cell ${isT ? 'today-c' : ''}" onclick="calClick(this,'${dateStr}')">
          <div class="cal-dn" style="color:${isT ? 'var(--accent)' : 'var(--text)'}">${d}</div>
          ${info.runtime_seconds > 0
            ? `<div class="cal-rt">${info.runtime_formatted}</div>
               <div class="cal-cy">${info.cycle_count} cycle${info.cycle_count!==1?'s':''}</div>
               <div class="cal-heat"><div class="cal-heat-fill" style="width:${info.efficiency_percent}%;background:${col}"></div></div>`
            : `<div class="cal-cy" style="color:var(--border)">No data</div>`}
        </div>`;
    }
    document.getElementById('cal-grid').innerHTML = html;
  }

  function calClick(el, date) {
    document.querySelectorAll('.sel-c').forEach(c => c.classList.remove('sel-c'));
    el.classList.add('sel-c');
    jumpToDay(date);
  }

  /* ─ HELPERS ─ */
  function fmtSec(s) {
    if (s <= 0) return '0s';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }
  function fmtDateShort(d) { return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  function ds(d) { return d instanceof Date ? d.toISOString().split('T')[0] : d; }
  function pad(n) { return String(n).padStart(2,'0'); }
  function heatColor(p) {
    if (p <= 0)  return 'var(--border)';
    if (p < 20)  return '#ef4444';
    if (p < 40)  return '#f59e0b';
    if (p < 70)  return '#3b82f6';
    return '#10b981';
  }

  /* ─ INIT ─ */
  document.getElementById('d-date').value = TODAY;
  loadHero();
  loadDaily();
  setInterval(loadHero, 15000);
</script>
</body>
</html>
