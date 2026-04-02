// config-mqttclient.js


const mqtt = require('mqtt');
const { processRuntime } = require('../controller');

const MQTT_URL         = process.env.MQTT_URL         || 'mqtt://localhost:1883';
const MQTT_TOPIC       = process.env.MQTT_TOPIC       || 'machine_data';
const CURRENT_THRESHOLD  = 0.5;
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
            if (!data.device_id) { console.error('❌ Missing device_id'); return; }

            let normalizedData = {
                device_id: data.device_id,
                current:   data.current || 0,
                status:    null,
                on_time:   data.on_time  || data.ON_time,
                off_time:  data.off_time || data.OFF_time
            };

            // Explicit status provided
            if (data.status || data.Device_status) {
                normalizedData.status = (data.status || data.Device_status).toUpperCase();
            }
            // Only current provided — infer status
            else if (data.current !== undefined) {
                const inferred = data.current > CURRENT_THRESHOLD ? 'ON' : 'OFF';
                if (lastStatus[data.device_id] === inferred) {
                    console.log(`   ⏭️ Status unchanged (${inferred}), skipping`);
                    return;
                }
                normalizedData.status = inferred;
                lastStatus[data.device_id] = inferred;
                console.log(`   📊 Inferred: ${inferred} (${data.current}A)`);
            } else {
                console.error('❌ No status or current in message'); return;
            }

            if (normalizedData.status !== 'ON' && normalizedData.status !== 'OFF') {
                console.error(`❌ Invalid status: ${normalizedData.status}`); return;
            }

            await processRuntime(normalizedData);

        } catch (err) {
            console.error('❌ Parse error:', err.message);
        }
    });

    client.on('error', err  => console.error('❌ MQTT Error:',  err.message));
    client.on('close',      () => console.log('⚠️ MQTT Connection closed'));

    return client;
};

module.exports = { connectMQTT, getClient: () => client };