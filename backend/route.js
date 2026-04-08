const express    = require('express');
const router     = express.Router();
const controller = require('./controller');
const { authenticateToken } = require('./config/auth');

const validateDeviceId = (req, res, next) => {
    const { device_id } = req.params;
    if (!device_id || device_id === 'undefined' || device_id === 'null') {
        return res.status(400).json({ error: 'Invalid device_id parameter' });
    }
    next();
};

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
router.post('/login', controller.login);

// ─── PROTECTED ────────────────────────────────────────────────────────────────
router.post('/register',          authenticateToken, controller.registerDevice);
router.get('/devices',            authenticateToken, controller.getDevices);
router.get('/all-daily-runtime',                     controller.getAllDailyRuntime);

router.get('/device/:device_id',  authenticateToken, validateDeviceId, controller.getDevice);

router.put('/device/:device_id/threshold',  validateDeviceId, controller.updateDeviceThreshold);
router.post('/device/:device_id/push-config', authenticateToken, validateDeviceId, controller.pushDeviceConfig);

router.get('/threshold/:device_id',    validateDeviceId, controller.getThreshold);
router.get('/runtime/:device_id',      validateDeviceId, controller.getRuntime);
router.get('/cycles/:device_id',       validateDeviceId, controller.getCycles);
router.get('/daily-summary/:device_id',validateDeviceId, controller.getDailySummary);

module.exports = router;