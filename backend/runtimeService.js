// runtimeservice.js 
const pool = require('./config/db');

// Store device states in memory
const deviceState = {};

exports.processRuntime = async (data) => {
    const { device_id, current, status } = data;
    const now = new Date();
    
    console.log('\n========== RUNTIME CALCULATION ==========');
    console.log(`Device: ${device_id}`);
    console.log(`Status: ${status}`);
    console.log(`Current: ${current}A`);
    console.log(`Time: ${now.toLocaleString()}`);
    
    // Initialize device state if not exists
    if (!deviceState[device_id]) {
        deviceState[device_id] = {
            lastStatus: 'OFF',
            startTime: null,
            lastUpdate: now
        };
    }
    
    const state = deviceState[device_id];
    
    // 1. Save to machine_logs
    try {
        await pool.execute(
            `INSERT INTO machine_logs (device_id, current, status, timestamp)
             VALUES (?, ?, ?, ?)`,
            [device_id, current, status, now]
        );
        console.log(`✅ Log saved: ${device_id} - ${status}`);
    } catch (err) {
        console.error('❌ Log save error:', err);
    }
    
    // 2. RUNTIME LOGIC - Machine STARTED (OFF → ON)
    if (status === 'ON' && state.lastStatus === 'OFF') {
        state.startTime = now;
        console.log(`🔴 MACHINE STARTED at: ${now.toLocaleTimeString()}`);
    }
    
    // 3. RUNTIME LOGIC - Machine STOPPED (ON → OFF)
    if (status === 'OFF' && state.lastStatus === 'ON') {
        if (state.startTime) {
            const runtimeSeconds = Math.floor((now - state.startTime) / 1000);
            
            console.log(`🔴 MACHINE STOPPED at: ${now.toLocaleTimeString()}`);
            console.log(`   Runtime: ${runtimeSeconds} seconds`);
            
            // Save to runtime table
            try {
                await pool.execute(
                    `INSERT INTO runtime (device_id, date, total_runtime)
                     VALUES (?, CURDATE(), ?)
                     ON DUPLICATE KEY UPDATE total_runtime = total_runtime + ?`,
                    [device_id, runtimeSeconds, runtimeSeconds]
                );
                console.log(`✅ Runtime saved: +${runtimeSeconds} seconds`);
            } catch (err) {
                console.error('❌ Runtime save error:', err);
            }
            
            state.startTime = null;
        }
    }
    
    // Update last status
    state.lastStatus = status;
    state.lastUpdate = now;
    
    console.log(`Current State: ${state.lastStatus}`);
    console.log('==========================================\n');
    
    return { success: true };
};

exports.getTodayRuntime = async (device_id) => {
    const [rows] = await pool.execute(
        `SELECT total_runtime, date 
         FROM runtime 
         WHERE device_id = ? AND date = CURDATE()`,
        [device_id]
    );
    
    const runtimeSeconds = rows[0]?.total_runtime || 0;
    return {
        seconds: runtimeSeconds,
        minutes: (runtimeSeconds / 60).toFixed(2),
        hours: (runtimeSeconds / 3600).toFixed(2)
    };
};

exports.getDeviceStatus = (device_id) => {
    if (!deviceState[device_id]) {
        return { status: 'UNKNOWN', isRunning: false, currentSessionRuntime: 0 };
    }
    
    const state = deviceState[device_id];
    let currentRuntime = 0;
    
    if (state.lastStatus === 'ON' && state.startTime) {
        currentRuntime = Math.floor((new Date() - state.startTime) / 1000);
    }
    
    return {
        status: state.lastStatus,
        isRunning: state.lastStatus === 'ON',
        startTime: state.startTime,
        currentSessionRuntime: currentRuntime,
        lastUpdate: state.lastUpdate
    };
};