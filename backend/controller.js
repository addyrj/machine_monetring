const pool = require('./config/db');
const runtimeService = require('./runtimeService');

exports.registerDevice = async (req, res) => {
    try {
        const { device_id, machine_name } = req.body;
        
        if (!device_id || !machine_name) {
            return res.status(400).json({ error: 'device_id and machine_name required' });
        }
        
        const [existing] = await pool.execute(
            'SELECT * FROM devices WHERE device_id = ?',
            [device_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Device already exists' });
        }
        
        await pool.execute(
            'INSERT INTO devices (device_id, machine_name) VALUES (?, ?)',
            [device_id, machine_name]
        );
        
        res.json({ success: true, message: 'Device Registered', device: { device_id, machine_name } });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const [devices] = await pool.execute('SELECT * FROM devices ORDER BY created_at DESC');
        res.json(devices);
    } catch (err) {
        console.error('Get Devices Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.simulateData = async (req, res) => {
    try {
        const { device_id, current, status } = req.body;
        
        if (!device_id || !status) {
            return res.status(400).json({ error: 'device_id and status required' });
        }
        
        if (status !== 'ON' && status !== 'OFF') {
            return res.status(400).json({ error: 'status must be ON or OFF' });
        }
        
        const [devices] = await pool.execute(
            'SELECT * FROM devices WHERE device_id = ?',
            [device_id]
        );
        
        if (devices.length === 0) {
            return res.status(400).json({ error: 'Device not found. Please register first.' });
        }
        
        await runtimeService.processRuntime({
            device_id,
            current: current || (status === 'ON' ? 2.5 : 0),
            status
        });
        
        const deviceStatus = runtimeService.getDeviceStatus(device_id);
        const todayRuntime = await runtimeService.getTodayRuntime(device_id);
        
        res.json({
            success: true,
            message: `Data processed: ${status}`,
            device: devices[0],
            current_status: deviceStatus,
            today_runtime: todayRuntime
        });
    } catch (err) {
        console.error('Simulate Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getRuntime = async (req, res) => {
    try {
        const { device_id } = req.params;
        const todayRuntime = await runtimeService.getTodayRuntime(device_id);
        const currentStatus = runtimeService.getDeviceStatus(device_id);
        
        res.json({
            device_id,
            today: todayRuntime,
            current_status: currentStatus
        });
    } catch (err) {
        console.error('Get Runtime Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const { device_id } = req.params;
        const [logs] = await pool.execute(
            'SELECT * FROM machine_logs WHERE device_id = ? ORDER BY timestamp DESC LIMIT 50',
            [device_id]
        );
        res.json(logs);
    } catch (err) {
        console.error('Get Logs Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getAllRuntime = async (req, res) => {
    try {
        const [summary] = await pool.execute(
            `SELECT d.device_id, d.machine_name,
                    COALESCE(SUM(r.total_runtime), 0) as total_seconds,
                    ROUND(COALESCE(SUM(r.total_runtime), 0) / 3600, 2) as total_hours
             FROM devices d
             LEFT JOIN runtime r ON d.device_id = r.device_id
             GROUP BY d.device_id, d.machine_name`
        );
        res.json(summary);
    } catch (err) {
        console.error('Get Summary Error:', err);
        res.status(500).json({ error: err.message });
    }
};