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
};