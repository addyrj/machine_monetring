// //controller.js 


const pool = require('./config/db');

// ─── IN-MEMORY DEVICE STATE ───────────────────────────────────────────────────
const deviceState = {};

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

// ─── CORE MQTT PROCESSOR ──────────────────────────────────────────────────────
const processRuntime = async (data) => {
    const { device_id, current, status } = data;
    const now = new Date();

    console.log('\n========== RUNTIME CALCULATION ==========');
    console.log(`Device: ${device_id} | Status: ${status} | Time: ${now.toLocaleString()}`);

    if (!deviceState[device_id]) {
        deviceState[device_id] = {
            lastStatus: 'OFF',
            startTime: null,
            lastUpdate: now,
            todayCycles: 0
        };
    }

    const state = deviceState[device_id];

    // Save to machine_logs
    try {
        await pool.execute(
            `INSERT INTO machine_logs (device_id, current, status, timestamp) VALUES (?, ?, ?, ?)`,
            [device_id, current, status, now]
        );
        console.log(`✅ Log saved: ${device_id} – ${status}`);
    } catch (err) {
        console.error('❌ Log save error:', err);
    }

    // Machine STARTED (OFF → ON)
    if (status === 'ON' && state.lastStatus === 'OFF') {
        state.startTime = now;
        console.log(`🟢 STARTED at ${now.toLocaleTimeString()} | Cycle #${state.todayCycles + 1}`);
    }

    // Machine STOPPED (ON → OFF)
    if (status === 'OFF' && state.lastStatus === 'ON' && state.startTime) {
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

    state.lastStatus = status;
    state.lastUpdate = now;

    console.log(`State: ${state.lastStatus} | Today's Cycles: ${state.todayCycles}`);
    console.log('==========================================\n');

    return { success: true };
};

// ─── INTERNAL QUERIES ─────────────────────────────────────────────────────────

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
                durationFormatted:formatDuration(dur),
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
            durationFormatted:formatDuration(dur) + ' (running)',
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
        totalRuntimeFormatted:formatDuration(totalRuntime),
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
    const end = new Date(endDate   + 'T00:00:00');

    while (cur <= end) {
        const ds = cur.toISOString().split('T')[0];
        const runtime = runtimeMap[ds] || 0;
        result.push({
            date:              ds,
            runtime_seconds:   runtime,
            runtime_hours:     (runtime / 3600).toFixed(2),
            runtime_formatted: formatDuration(runtime),
            cycle_count:       cycleMap[ds] || 0,
            efficiency_percent:((runtime / 86400) * 100).toFixed(1)
        });
        cur.setDate(cur.getDate() + 1);
    }

    return result;
}

// ─── CONTROLLERS ──────────────────────────────────────────────────────────────

exports.registerDevice = async (req, res) => {
    try {
        const { device_id, machine_name } = req.body;
        if (!device_id || !machine_name)
            return res.status(400).json({ error: 'device_id and machine_name required' });

        const [existing] = await pool.execute(
            'SELECT device_id FROM devices WHERE device_id = ?', [device_id]
        );
        if (existing.length > 0)
            return res.status(400).json({ error: 'Device already exists' });

        await pool.execute(
            'INSERT INTO devices (device_id, machine_name) VALUES (?, ?)',
            [device_id, machine_name]
        );
        res.json({ success: true, device: { device_id, machine_name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const [devices] = await pool.execute('SELECT * FROM devices ORDER BY created_at DESC');
        res.json(devices);
    } catch (err) {
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
exports.processRuntime = processRuntime;