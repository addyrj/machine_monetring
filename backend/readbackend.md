



PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=machine_monitor

# MQTT_URL=mqtt://mqtt.rank2top.in:1883
# MQTT_TOPIC=machine_data

# MQTT Configuration
MQTT_URL=mqtt://mqtt.rank2top.in:1883
MQTT_DATA_TOPIC=machine_data
MQTT_CONTROL_TOPIC=machine_control


JWT_SECRET=mySuperSecretKey123
FRONTEND_URL=http://localhost:3000

// config-mqttclient.js
const mqtt = require('mqtt');
const { processRuntime } = require('../controller');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const MQTT_DATA_TOPIC = process.env.MQTT_DATA_TOPIC || 'machine_data';
const MQTT_CONTROL_TOPIC = process.env.MQTT_CONTROL_TOPIC || 'machine_control';

let client = null;
let isConnected = false;

const connectMQTT = () => {
    console.log(`🔌 Connecting to MQTT at ${MQTT_URL}…`);

    client = mqtt.connect(MQTT_URL, {
        clientId: `backend_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000
    });

    client.on('connect', () => {
        console.log('✅ MQTT Connected:', MQTT_URL);
        isConnected = true;
        
        // Subscribe to data topic (single topic for all devices)
        client.subscribe(MQTT_DATA_TOPIC, { qos: 1 }, (err) => {
            if (!err) {
                console.log(`📡 Subscribed to: ${MQTT_DATA_TOPIC}`);
            } else {
                console.error('❌ Subscribe error:', err.message);
            }
        });
    });

    client.on('message', async (topic, message) => {
        // Only process messages from our data topic
        if (topic !== MQTT_DATA_TOPIC) return;

        const raw = message.toString();
        if (!raw || raw === 'null' || raw.trim() === '') {
            console.warn('⚠️ Empty MQTT message received');
            return;
        }

        console.log(`\n📩 MQTT [${topic}] | Raw: ${raw}`);

        try {
            const data = JSON.parse(raw);
            
            // Validate device_id is present in payload
            if (!data.device_id) {
                console.error('❌ Missing device_id in MQTT payload:', data);
                return;
            }

            console.log(`📊 Processing data from device: ${data.device_id}`);
            
            await processRuntime({
                device_id: data.device_id,
                current: data.current || data.current_value || data.amp || 0,
                status: data.status || data.Device_status || data.state || null,
                voltage: data.voltage || null,
                power: data.power || null,
                temperature: data.temperature || null
            });
            
        } catch (err) {
            console.error('❌ MQTT Parse error:', err.message);
            console.error('   Raw message:', raw);
        }
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err.message);
        isConnected = false;
    });
    
    client.on('close', () => {
        console.log('⚠️ MQTT Connection closed');
        isConnected = false;
    });
    
    client.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting...');
    });

    return client;
};

/**
 * Publish config/command to devices
 * All devices subscribe to the same control topic
 * Each device checks device_id in payload to know if message is for them
 * 
 * @param {string} device_id - Target device ID
 * @param {object} payload - Configuration object
 * @param {boolean} retain - Retain message for offline devices
 */
const publishToDevice = (device_id, payload, retain = true) => {
    if (!client || !client.connected) {
        console.error('❌ MQTT not connected, cannot publish');
        return false;
    }
    
    // Add device_id to payload so devices can filter
    const message = {
        device_id: device_id,
        // timestamp: new Date().toISOString(),
        ...payload
    };
    
    const msg = JSON.stringify(message);
    
    client.publish(MQTT_CONTROL_TOPIC, msg, { qos: 1, retain: retain }, (err) => {
        if (err) {
            console.error(`❌ Publish error [${MQTT_CONTROL_TOPIC}]:`, err.message);
        } else {
            console.log(`📤 Published to ${MQTT_CONTROL_TOPIC} for device ${device_id}:`, msg);
        }
    });
    
    return true;
};

/**
 * Broadcast message to all devices
 */
const broadcastToAllDevices = (payload, retain = false) => {
    if (!client || !client.connected) {
        console.error('❌ MQTT not connected, cannot broadcast');
        return false;
    }
    
    const message = {
        broadcast: true,
        timestamp: new Date().toISOString(),
        ...payload
    };
    
    const msg = JSON.stringify(message);
    
    client.publish(MQTT_CONTROL_TOPIC, msg, { qos: 1, retain: retain }, (err) => {
        if (err) {
            console.error(`❌ Broadcast error [${MQTT_CONTROL_TOPIC}]:`, err.message);
        } else {
            console.log(`📢 Broadcast to all devices:`, msg);
        }
    });
    
    return true;
};

/**
 * Check if MQTT is connected
 */
const isMQTTConnected = () => {
    return isConnected && client && client.connected;
};

/**
 * Get MQTT client instance
 */
const getClient = () => client;

module.exports = {
    connectMQTT,
    publishToDevice,
    broadcastToAllDevices,
    isMQTTConnected,
    getClient,
    MQTT_DATA_TOPIC,
    MQTT_CONTROL_TOPIC
};

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
});const pool   = require('./config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const QRCode = require('qrcode'); // QR generation disabled

// ─── AUTHENTICATION ───────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'Username and password required' });

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?', [username]
        );
        if (users.length === 0)
            return res.status(401).json({ error: 'Invalid username or password' });

        const user            = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword)
            return res.status(401).json({ error: 'Invalid username or password' });

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'mySuperSecretKey123',
            { expiresIn: '96h' }
        );

        res.json({ success: true, token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── IN-MEMORY STATE ──────────────────────────────────────────────────────────
const deviceState          = {};
const deviceThresholdCache = {};

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

// REPLACE registerDevice in controller.js

exports.registerDevice = async (req, res) => {
    try {
        const { device_id, machine_name, wifi_ssid, wifi_password } = req.body;

        if (!device_id || !machine_name)
            return res.status(400).json({ error: 'device_id and machine_name are required' });

        // Update the pre-reserved row (or insert if manual entry)
        await pool.execute(
            `INSERT INTO devices (device_id, machine_name, current_threshold, min_current, max_current)
             VALUES (?, ?, 0, 0, 99)
             ON DUPLICATE KEY UPDATE
                machine_name = VALUES(machine_name)`,
            [device_id, machine_name]
        );

        delete deviceThresholdCache[device_id];

        // ✅ Step 1: ONLY send WiFi — NO threshold yet (threshold sent in Step 2)
        const { publishToDevice } = require('./config/mqttClient');
        let published = false;

        if (wifi_ssid || wifi_password) {
            const mqttPayload = {};
            if (wifi_ssid)     mqttPayload.wifi_ssid     = wifi_ssid;
            if (wifi_password) mqttPayload.wifi_password = wifi_password;
            published = publishToDevice(device_id, mqttPayload, true);
            console.log(`📡 Step1 MQTT (WiFi only) → ${device_id}:`, mqttPayload);
        }

        res.json({
            success:        true,
            device_id,
            machine_name,
            mqtt_published: published,
            next_step:      `PUT /api/device/${device_id}/threshold`
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// REPLACE updateDeviceThreshold in controller.js

exports.updateDeviceThreshold = async (req, res) => {
    try {
        const { device_id }         = req.params;
        const { current_threshold } = req.body;

        if (current_threshold === undefined)
            return res.status(400).json({ error: 'current_threshold is required' });

        const [rows] = await pool.execute(
            'SELECT min_current, max_current FROM devices WHERE device_id = ?',
            [device_id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Device not found' });

        const { min_current, max_current } = rows[0];

        if (current_threshold < min_current || current_threshold > max_current)
            return res.status(400).json({
                error: `Threshold must be between ${min_current} and ${max_current}`
            });

        await pool.execute(
            'UPDATE devices SET current_threshold = ? WHERE device_id = ?',
            [current_threshold, device_id]
        );

        delete deviceThresholdCache[device_id];

        // ✅ Step 2: ONLY send threshold — WiFi already sent in Step 1
        const { publishToDevice } = require('./config/mqttClient');
        const published = publishToDevice(device_id, { current_threshold }, true);
        console.log(`📡 Step2 MQTT (threshold only) → ${device_id}: ${current_threshold}A`);

        res.json({ success: true, device_id, current_threshold, mqtt_published: published });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── PUSH CONFIG TO DEVICE ────────────────────────────────────────────────────
exports.pushDeviceConfig = async (req, res) => {
    try {
        const { device_id }                                   = req.params;
        const { wifi_ssid, wifi_password, current_threshold } = req.body;

        if (!wifi_ssid && current_threshold === undefined)
            return res.status(400).json({ error: 'Provide at least wifi_ssid or current_threshold' });

        if (current_threshold !== undefined) {
            await pool.execute(
                'UPDATE devices SET current_threshold = ? WHERE device_id = ?',
                [current_threshold, device_id]
            );
            delete deviceThresholdCache[device_id];
        }

        const { publishToDevice } = require('./config/mqttClient');
        const payload = {};
        if (wifi_ssid)                       payload.wifi_ssid         = wifi_ssid;
        if (wifi_password)                   payload.wifi_password     = wifi_password;
        if (current_threshold !== undefined) payload.current_threshold = current_threshold;

        const published = publishToDevice(device_id, payload);
        res.json({ success: true, device_id, payload, mqtt_published: published });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── GET ALL DEVICES ──────────────────────────────────────────────────────────
exports.getDevices = async (req, res) => {
    try {
        const [devices] = await pool.execute('SELECT * FROM devices ORDER BY created_at DESC');
        res.json({
            success: true,
            count:   devices.length,
            devices: devices.map(d => ({
                device_id:         d.device_id,
                machine_name:      d.machine_name,
                current_threshold: d.current_threshold || 0,
                created_at:        d.created_at,
                updated_at:        d.updated_at
            }))
        });
    } catch (err) {
        console.error('Error in getDevices:', err);
        res.status(500).json({ error: err.message });
    }
};

// ─── GET SINGLE DEVICE ────────────────────────────────────────────────────────
exports.getDevice = async (req, res) => {
    try {
        const { device_id } = req.params;
        const [device] = await pool.execute(
            'SELECT * FROM devices WHERE device_id = ?', [device_id]
        );
        if (device.length === 0) return res.status(404).json({ error: 'Device not found' });
        res.json(device[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── GET THRESHOLD ────────────────────────────────────────────────────────────
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

// ─── DB HELPERS ───────────────────────────────────────────────────────────────
async function queryRuntimeForDate(device_id, date) {
    const [rows] = await pool.execute(
        `SELECT total_runtime FROM runtime WHERE device_id = ? AND date = ?`,
        [device_id, date]
    );
    return rows[0]?.total_runtime || 0;
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
    let cycleNum   = 0;
    let totalRuntime = 0;

    for (const log of logs) {
        if (log.status === 'ON' && !cycleStart) {
            cycleStart = new Date(log.timestamp);
            cycleNum++;
        } else if (log.status === 'OFF' && cycleStart) {
            const endTime = new Date(log.timestamp);
            const dur     = Math.floor((endTime - cycleStart) / 1000);
            totalRuntime += dur;
            const startSec = cycleStart.getHours() * 3600 + cycleStart.getMinutes() * 60 + cycleStart.getSeconds();
            cycles.push({
                cycleNumber:       cycleNum,
                startTime:         cycleStart.toLocaleTimeString(),
                endTime:           endTime.toLocaleTimeString(),
                durationSeconds:   dur,
                durationFormatted: formatDuration(dur),
                startPercent:      ((startSec / 86400) * 100).toFixed(3),
                widthPercent:      ((dur / 86400) * 100).toFixed(4),
                isRunning:         false
            });
            cycleStart = null;
        }
    }

    if (cycleStart) {
        const now = new Date();
        const dur = Math.floor((now - cycleStart) / 1000);
        totalRuntime += dur;
        const startSec = cycleStart.getHours() * 3600 + cycleStart.getMinutes() * 60 + cycleStart.getSeconds();
        cycles.push({
            cycleNumber:       cycleNum,
            startTime:         cycleStart.toLocaleTimeString(),
            endTime:           null,
            durationSeconds:   dur,
            durationFormatted: formatDuration(dur) + ' (running)',
            startPercent:      ((startSec / 86400) * 100).toFixed(3),
            widthPercent:      ((dur / 86400) * 100).toFixed(4),
            isRunning:         true
        });
    }

    const isToday           = date === todayStr();
    const totalSecondsInDay = isToday ? secondsSinceMidnight() : 86400;
    const downtime          = Math.max(0, totalSecondsInDay - totalRuntime);

    return {
        totalCycles:           cycleNum,
        totalRuntime,
        totalRuntimeFormatted: formatDuration(totalRuntime),
        downtime,
        downtimeFormatted:     formatDuration(downtime),
        efficiencyPercent:     totalSecondsInDay > 0
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
    runtimeRows.forEach(r => {
        const key = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
        runtimeMap[key] = r.total_runtime;
    });
    const cycleMap = {};
    cycleRows.forEach(r => {
        const key = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
        cycleMap[key] = r.cycle_count;
    });

    const result = [];
    const cur    = new Date(startDate + 'T00:00:00');
    const end    = new Date(endDate   + 'T00:00:00');
    while (cur <= end) {
        const ds      = cur.toISOString().split('T')[0];
        const runtime = runtimeMap[ds] || 0;
        result.push({
            date:               ds,
            runtime_seconds:    runtime,
            runtime_hours:      (runtime / 3600).toFixed(2),
            runtime_formatted:  formatDuration(runtime),
            cycle_count:        cycleMap[ds] || 0,
            efficiency_percent: ((runtime / 86400) * 100).toFixed(1)
        });
        cur.setDate(cur.getDate() + 1);
    }
    return result;
}

async function getDeviceThreshold(device_id) {
    if (deviceThresholdCache[device_id] &&
        (Date.now() - deviceThresholdCache[device_id].timestamp < 60000)) {
        return deviceThresholdCache[device_id].threshold;
    }
    try {
        const [rows] = await pool.execute(
            'SELECT current_threshold FROM devices WHERE device_id = ?', [device_id]
        );
        const threshold = rows[0]?.current_threshold || 0.5;
        deviceThresholdCache[device_id] = { threshold, timestamp: Date.now() };
        return threshold;
    } catch (err) {
        console.error(`Error getting threshold for ${device_id}:`, err);
        return 0.5;
    }
}

// ─── CORE MQTT PROCESSOR ──────────────────────────────────────────────────────
const processRuntime = async (data) => {
    const { device_id, current, status: providedStatus } = data;
    const now = new Date();

    const currentThreshold = await getDeviceThreshold(device_id);
    let finalStatus        = providedStatus;

    if (!finalStatus && current !== undefined) {
        const inferred = current > currentThreshold ? 'ON' : 'OFF';
        if (!deviceState[device_id]) {
            deviceState[device_id] = { lastStatus: inferred, startTime: null, lastUpdate: now, todayCycles: 0, lastCurrent: current };
        }
        if (deviceState[device_id].lastStatus === inferred) {
            deviceState[device_id].lastCurrent = current;
            return { success: true, skipped: true };
        }
        finalStatus = inferred;
    }

    if (!finalStatus || (finalStatus !== 'ON' && finalStatus !== 'OFF')) {
        return { success: false, error: 'Invalid status' };
    }

    if (!deviceState[device_id]) {
        deviceState[device_id] = { lastStatus: 'OFF', startTime: null, lastUpdate: now, todayCycles: 0, lastCurrent: current || 0, currentThreshold };
    }

    const state            = deviceState[device_id];
    state.currentThreshold = currentThreshold;
    if (current !== undefined) state.lastCurrent = current;

    try {
        await pool.execute(
            `INSERT INTO machine_logs (device_id, current, status, timestamp, current_threshold)
             VALUES (?, ?, ?, ?, ?)`,
            [device_id, current || 0, finalStatus, now, currentThreshold]
        );
    } catch (err) {
        console.error('❌ Log save error:', err);
    }

    if (finalStatus === 'ON' && state.lastStatus === 'OFF') {
        state.startTime = now;
    }

    if (finalStatus === 'OFF' && state.lastStatus === 'ON' && state.startTime) {
        const runtimeSeconds = Math.floor((now - state.startTime) / 1000);
        const today = todayStr();
        try {
            await pool.execute(
                `INSERT INTO runtime (device_id, date, total_runtime)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE total_runtime = total_runtime + ?`,
                [device_id, today, runtimeSeconds, runtimeSeconds]
            );
        } catch (err) {
            console.error('❌ Runtime save error:', err);
        }
        state.todayCycles++;
        state.startTime = null;
    }

    state.lastStatus = finalStatus;
    state.lastUpdate = now;
    return { success: true };
};

// ─── GET RUNTIME ──────────────────────────────────────────────────────────────
exports.getRuntime = async (req, res) => {
    try {
        const { device_id } = req.params;
        const date           = req.query.date || todayStr();
        const runtimeSeconds = await queryRuntimeForDate(device_id, date);
        const state          = deviceState[device_id] || { lastStatus: 'UNKNOWN', todayCycles: 0, startTime: null };
        let currentSessionRuntime = 0;
        if (state.lastStatus === 'ON' && state.startTime)
            currentSessionRuntime = Math.floor((new Date() - state.startTime) / 1000);
        res.json({
            device_id, date,
            runtime_seconds:           runtimeSeconds,
            runtime_formatted:         formatDuration(runtimeSeconds),
            runtime_hours:             (runtimeSeconds / 3600).toFixed(2),
            current_status:            state.lastStatus,
            today_cycles:              state.todayCycles,
            current_session:           currentSessionRuntime,
            current_session_formatted: formatDuration(currentSessionRuntime)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCycles       = async (req, res) => {
    try {
        const { device_id } = req.params;
        const date           = req.query.date || todayStr();
        const data           = await queryCyclesForDate(device_id, date);
        res.json({ device_id, date, ...data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDailySummary = async (req, res) => {
    try {
        const { device_id }  = req.params;
        const { start, end } = req.query;
        if (!start || !end)
            return res.status(400).json({ error: 'start and end dates required (YYYY-MM-DD)' });
        const data = await queryDailySummary(device_id, start, end);
        res.json({ device_id, start, end, days: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllDailyRuntime = async (req, res) => {
    try {
        const date   = req.query.date || todayStr();
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
            runtime_hours:      (row.total_seconds / 3600).toFixed(2),
            runtime_formatted:  formatDuration(row.total_seconds),
            efficiency_percent: ((row.total_seconds / 86400) * 100).toFixed(1)
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// REPLACE generateNextDeviceId function in controller.js

async function generateNextDeviceId() {
    const PREFIX = 'ISPOA';
    const CURRENT_YEAR = new Date().getFullYear().toString().slice(-2); // "26"
    const BASE_NUM = parseInt(`${CURRENT_YEAR}001`); // 26001

    try {
        const [rows] = await pool.execute(
            `SELECT device_id FROM devices
             WHERE device_id LIKE 'ISPOA%'
             ORDER BY CAST(SUBSTRING(device_id, 6) AS UNSIGNED) DESC
             LIMIT 1`
        );

        if (rows.length === 0) {
            return `${PREFIX}${BASE_NUM}`;
        }

        const last = rows[0].device_id;
        const numPart = parseInt(last.replace(PREFIX, ''), 10);
        const nextNum = numPart + 1;
        return `${PREFIX}${nextNum}`;
    } catch (err) {
        console.error('Error generating device ID:', err);
        return `${PREFIX}${BASE_NUM}`;
    }
}

// REPLACE generateDeviceQR in controller.js

exports.generateDeviceQR = async (req, res) => {
    try {
        const QRCode = require('qrcode');

        // Generate unique ID
        const device_id = await generateNextDeviceId();

        // ✅ Reserve IMMEDIATELY in DB so next call gets a new ID
        const [insertResult] = await pool.execute(
            `INSERT INTO devices (device_id, machine_name, current_threshold, min_current, max_current)
             VALUES (?, 'UNREGISTERED', 0, 0, 99)`,
            [device_id]
        );

        if (insertResult.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to reserve device ID' });
        }

        console.log(`✅ Reserved device ID: ${device_id}`);

        const qr_base64 = await QRCode.toDataURL(device_id, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            width: 300,
            color: { dark: '#000000', light: '#ffffff' }
        });

        const qr_svg = await QRCode.toString(device_id, {
            type: 'svg',
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        res.json({
            success:   true,
            device_id,
            qr_base64,
            qr_svg,
            message:   `QR generated for ${device_id} — stick it on the device before registering`
        });

    } catch (err) {
        console.error('QR generation error:', err);
        // If duplicate key (race condition), retry once
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'ID conflict, please try again' });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.getDeviceQR = async (req, res) => {
    try {
        const QRCode = require('qrcode');
        const { device_id } = req.params;

        // Check if device exists
        const [rows] = await pool.execute(
            'SELECT device_id, machine_name FROM devices WHERE device_id = ?',
            [device_id]
        );

        const qr_base64 = await QRCode.toDataURL(device_id, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            width: 300,
            color: { dark: '#000000', light: '#ffffff' }
        });

        const qr_svg = await QRCode.toString(device_id, {
            type: 'svg',
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        res.json({
            success: true,
            device_id,
            registered: rows.length > 0,
            machine_name: rows.length > 0 ? rows[0].machine_name : null,
            qr_base64,
            qr_svg
        });
    } catch (err) {
        console.error('QR generation error:', err);
        res.status(500).json({ error: err.message });
    }
};


exports.processRuntime = processRuntime;

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

const validateDeviceId = (req, res, next) => {
  const { device_id } = req.params;
  if (!device_id || device_id === "undefined" || device_id === "null") {
    return res.status(400).json({ error: "Invalid device_id parameter" });
  }
  next();
};

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
router.post("/login", controller.login);

// ─── QR CODE ROUTES — DISABLED ────────────────────────────────────────────────
router.get(
  "/device/generate-qr",
  authenticateToken,
  controller.generateDeviceQR,
);
router.get(
  "/device/qr/:device_id",
  authenticateToken,
  validateDeviceId,
  controller.getDeviceQR,
);

// ─── PROTECTED ────────────────────────────────────────────────────────────────
// Step 1: Register device (scan QR → device_id + machine_name + wifi)
router.post("/register", authenticateToken, controller.registerDevice);

// Step 2: Set threshold (second modal after registration)
router.put(
  "/device/:device_id/threshold",
  authenticateToken,
  validateDeviceId,
  controller.updateDeviceThreshold,
);

// Push WiFi + threshold via MQTT anytime
router.post(
  "/device/:device_id/push-config",
  authenticateToken,
  validateDeviceId,
  controller.pushDeviceConfig,
);

router.get("/devices", authenticateToken, controller.getDevices);
router.get(
  "/device/:device_id",
  authenticateToken,
  validateDeviceId,
  controller.getDevice,
);

// ─── PUBLIC DATA ENDPOINTS ────────────────────────────────────────────────────
router.get("/all-daily-runtime", controller.getAllDailyRuntime);
router.get("/threshold/:device_id", validateDeviceId, controller.getThreshold);
router.get("/runtime/:device_id", validateDeviceId, controller.getRuntime);
router.get("/cycles/:device_id", validateDeviceId, controller.getCycles);
router.get(
  "/daily-summary/:device_id",
  validateDeviceId,
  controller.getDailySummary,
);

module.exports = router;
