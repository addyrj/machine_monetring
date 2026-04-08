// config-mqttclient.js

const mqtt = require('mqtt');
const { processRuntime } = require('../controller');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';

let client = null;

const connectMQTT = () => {
    console.log(`🔌 Connecting to MQTT at ${MQTT_URL}…`);

    client = mqtt.connect(MQTT_URL, {
        clientId:        `backend_${Math.random().toString(16).substr(2, 8)}`,
        clean:           true,
        connectTimeout:  4000,
        reconnectPeriod: 1000
    });

    client.on('connect', () => {
        console.log('✅ MQTT Connected:', MQTT_URL);
        // Subscribe to ALL devices data topic using wildcard
        client.subscribe('machine/+/data', err => {
            if (!err) console.log(`📡 Subscribed: machine/+/data`);
            else      console.error('❌ Subscribe error:', err.message);
        });
    });

    client.on('message', async (topic, message) => {
        // topic format: machine/{device_id}/data
        const parts = topic.split('/');
        if (parts.length !== 3 || parts[2] !== 'data') return;
        const device_id = parts[1];

        const raw = message.toString();
        if (!raw || raw === 'null' || raw.trim() === '') return;

        console.log(`\n📩 MQTT [${topic}] | Raw: ${raw}`);

        try {
            const data = JSON.parse(raw);
            await processRuntime({
                device_id: device_id,
                current:   data.current || data.current_value || 0,
                status:    data.status  || data.Device_status || null
            });
        } catch (err) {
            console.error('❌ Parse error:', err.message);
        }
    });

    client.on('error', err => console.error('❌ MQTT Error:', err.message));
    client.on('close',    () => console.log('⚠️ MQTT Connection closed'));

    return client;
};

/**
 * Publish config/command to a specific device
 * Topic: machine/{device_id}/control
 * retain: true — device gets config even if it was offline
 */
const publishToDevice = (device_id, payload) => {
    if (!client || !client.connected) {
        console.error('❌ MQTT not connected, cannot publish');
        return false;
    }
    const topic = `machine/${device_id}/control`;
    const msg   = JSON.stringify(payload);
    client.publish(topic, msg, { qos: 1, retain: true }, err => {
        if (err) console.error(`❌ Publish error [${topic}]:`, err.message);
        else     console.log(`📤 Published [${topic}]:`, msg);
    });
    return true;
};

module.exports = { connectMQTT, publishToDevice, getClient: () => client };