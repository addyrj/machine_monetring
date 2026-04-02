
const express = require('express');
const router = express.Router();
const controller = require('./controller');

// Device management
router.post('/register',                  controller.registerDevice);
router.get('/devices',                    controller.getDevices);

// Runtime & status
router.get('/runtime/:device_id',         controller.getRuntime);

// Cycles for a specific date  (?date=YYYY-MM-DD, defaults to today)
router.get('/cycles/:device_id',          controller.getCycles);

// Daily summary for a date range  (?start=YYYY-MM-DD&end=YYYY-MM-DD)
router.get('/daily-summary/:device_id',   controller.getDailySummary);

// All devices summary for a given date  (?date=YYYY-MM-DD)
router.get('/all-daily-runtime',          controller.getAllDailyRuntime);

module.exports = router;