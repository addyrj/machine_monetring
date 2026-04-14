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