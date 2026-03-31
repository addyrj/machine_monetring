// config/mqttClient.js
const mqtt = require('mqtt');
const { processRuntime } = require('../runtimeService');

// MQTT Configuration
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'machine_data';

let client = null;

const connectMQTT = () => {
    console.log(`🔌 Connecting to MQTT at ${MQTT_URL}...`);
    
    client = mqtt.connect(MQTT_URL, {
        clientId: `backend_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000
    });

    client.on('connect', () => {
        console.log('✅ MQTT Connected to:', MQTT_URL);
        
        // Subscribe to topics
        client.subscribe(MQTT_TOPIC, (err) => {
            if (!err) {
                console.log(`📡 Subscribed to: ${MQTT_TOPIC}`);
                console.log(`   Waiting for messages...\n`);
            }
        });
        
        // Also subscribe to wildcard for multiple devices
        client.subscribe('machine/+/data', (err) => {
            if (!err) {
                console.log(`📡 Subscribed to: machine/+/data`);
            }
        });
    });

    client.on('message', async (topic, message) => {
        const raw = message.toString();
        console.log(`\n📩 MQTT Message Received:`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Raw: ${raw}`);
        
        try {
            const data = JSON.parse(raw);
            console.log(`   Parsed:`, data);
            
            // Validate data
            if (!data.device_id || !data.status) {
                console.error('❌ Invalid message: missing device_id or status');
                return;
            }
            
            // Process runtime
            await processRuntime(data);
            
        } catch (err) {
            console.error('❌ Parse Error:', err.message);
        }
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err.message);
    });

    client.on('close', () => {
        console.log('⚠️ MQTT Connection closed');
    });
    
    return client;
};

// Export function to get client
module.exports = { connectMQTT, getClient: () => client };