const pool   = require('./config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');


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
            { id: user.id, username: user.username, role: user.role || 'user' },
            process.env.JWT_SECRET || 'mySuperSecretKey123',
            { expiresIn: '96h' }
        );

        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user.id, 
                username: user.username,
                role: user.role || 'user'
            } 
        });
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



// ── SUPER ADMIN: GET DEVICES BY COMPANY ────────────────────────────────────
exports.getDevicesByCompany = async (req, res) => {
    try {
        const { company_id } = req.query;
        
        let query = 'SELECT * FROM devices';
        let params = [];
        
        if (company_id) {
            query += ' WHERE company_id = ?';
            params.push(company_id);
        }
        
        query += ' ORDER BY created_at DESC';

        const [devices] = await pool.execute(query, params);
        
        res.json({
            success: true,
            count: devices.length,
            company_id: company_id || 'all',
            devices: devices.map(d => ({
                device_id: d.device_id,
                machine_name: d.machine_name,
                company_id: d.company_id,
                status: d.status,
                current_threshold: d.current_threshold || 0,
                created_at: d.created_at,
                updated_at: d.updated_at
            }))
        });
    } catch (err) {
        console.error('Error getting devices by company:', err);
        res.status(500).json({ error: err.message });
    }
};

// ── DEVICE REGISTRATION WITH CONFIRMATION ──────────────────────────────────
exports.registerDevice = async (req, res) => {
    try {
        const { device_id, machine_name, wifi_ssid, wifi_password, company_id } = req.body;

        if (!device_id || !machine_name)
            return res.status(400).json({ error: 'device_id and machine_name are required' });

        // Update device as 'pending_confirmation'
        await pool.execute(
            `UPDATE devices 
             SET machine_name = ?, status = 'pending_confirmation', company_id = ?
             WHERE device_id = ?`,
            [machine_name, company_id || null, device_id]
        );

        // Send WiFi config if provided (Step 1)
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
            success: true,
            device_id,
            machine_name,
            status: 'pending_confirmation',
            mqtt_published: published,
            message: 'Device registered. Waiting for device confirmation...'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── DEVICE CONFIRMATION FROM DEVICE ────────────────────────────────────────
// Call this when device confirms WiFi connection
exports.confirmDeviceRegistration = async (req, res) => {
    try {
        const { device_id } = req.params;

        // Update device status to 'active'
        await pool.execute(
            `UPDATE devices SET status = 'active' WHERE device_id = ?`,
            [device_id]
        );

        console.log(`✅ Device confirmed: ${device_id}`);
        
        res.json({
            success: true,
            device_id,
            status: 'active',
            message: 'Device confirmed. Ready to set threshold.'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── RESEND WIFI CONFIG ─────────────────────────────────────────────────────
exports.resendWiFiConfig = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { wifi_ssid, wifi_password } = req.body;

        if (!wifi_ssid && !wifi_password)
            return res.status(400).json({ error: 'Provide at least wifi_ssid or wifi_password' });

        // Update in DB
        const [rows] = await pool.execute(
            'SELECT * FROM devices WHERE device_id = ?', [device_id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Device not found' });

        const { publishToDevice } = require('./config/mqttClient');
        const payload = {};
        if (wifi_ssid)     payload.wifi_ssid     = wifi_ssid;
        if (wifi_password) payload.wifi_password = wifi_password;

        const published = publishToDevice(device_id, payload, true);
        console.log(`📡 WiFi Resend → ${device_id}:`, payload);

        res.json({ 
            success: true, 
            device_id, 
            payload, 
            mqtt_published: published,
            message: 'WiFi config resent to device'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── UPDATE DEVICE THRESHOLD (WITH MODAL) ───────────────────────────────────
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

        // Send threshold via MQTT
        const { publishToDevice } = require('./config/mqttClient');
        const published = publishToDevice(device_id, { current_threshold }, true);
        console.log(`📡 Threshold Updated → ${device_id}: ${current_threshold}A`);

        res.json({ 
            success: true, 
            device_id, 
            current_threshold, 
            mqtt_published: published,
            message: 'Threshold updated successfully'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET DEVICE (WITH ALL DETAILS) ──────────────────────────────────────────
exports.getDevice = async (req, res) => {
    try {
        const { device_id } = req.params;
        const [device] = await pool.execute(
            'SELECT * FROM devices WHERE device_id = ?', [device_id]
        );
        if (device.length === 0) return res.status(404).json({ error: 'Device not found' });
        
        res.json({
            ...device[0],
            wifi_configured: device[0].status === 'active' || device[0].status === 'confirmed'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── REMOVE DEVICE ──────────────────────────────────────────────────────────
exports.removeDevice = async (req, res) => {
    try {
        const { device_id } = req.params;
        
        const [result] = await pool.execute(
            'DELETE FROM devices WHERE device_id = ?', [device_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        delete deviceThresholdCache[device_id];
        console.log(`🗑️ Device removed: ${device_id}`);

        res.json({ 
            success: true, 
            device_id, 
            message: 'Device removed successfully' 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET ALL DEVICES ────────────────────────────────────────────────────────
exports.getDevices = async (req, res) => {
    try {
        const [devices] = await pool.execute('SELECT * FROM devices ORDER BY created_at DESC');
        res.json({
            success: true,
            count:   devices.length,
            devices: devices.map(d => ({
                device_id:         d.device_id,
                machine_name:      d.machine_name,
                company_id:        d.company_id,
                status:            d.status,
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

// ── GET THRESHOLD ──────────────────────────────────────────────────────────
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

exports.processRuntime = processRuntime;