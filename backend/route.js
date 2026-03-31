const express = require('express');
const router = express.Router();
const ctrl = require('./controller');

// Routes
router.post('/register', ctrl.registerDevice);
router.get('/devices', ctrl.getDevices);
router.post('/simulate', ctrl.simulateData);
router.get('/runtime/:device_id', ctrl.getRuntime);
router.get('/logs/:device_id', ctrl.getLogs);
router.get('/summary', ctrl.getAllRuntime);

module.exports = router;