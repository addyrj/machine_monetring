const express = require("express");
const router = express.Router();
const controller = require("./controller");
const { authenticateToken, requireRole } = require("./config/auth");

const validateDeviceId = (req, res, next) => {
  const { device_id } = req.params;
  if (!device_id || device_id === "undefined" || device_id === "null") {
    return res.status(400).json({ error: "Invalid device_id parameter" });
  }
  next();
};

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
router.post("/login", controller.login);



// ─── SUPER ADMIN ONLY: GET DEVICES BY COMPANY ─────────────────────────────────
router.get(
  "/admin/devices",
  authenticateToken,
  requireRole('admin'),
  controller.getDevicesByCompany
);

// ─── DEVICE REGISTRATION (NEW WITH CONFIRMATION) ────────────────────────────
router.post(
  "/register",
  authenticateToken,
  controller.registerDevice
);

// ─── DEVICE CONFIRMATION FROM DEVICE (When WiFi is connected) ──────────────
router.post(
  "/device/:device_id/confirm",
  validateDeviceId,
  controller.confirmDeviceRegistration
);

// ─── RESEND WIFI CONFIG (For existing devices) ────────────────────────────
router.put(
  "/device/:device_id/wifi",
  authenticateToken,
  validateDeviceId,
  controller.resendWiFiConfig
);

// ─── UPDATE THRESHOLD (SEPARATE MODAL) ────────────────────────────────────
router.put(
  "/device/:device_id/threshold",
  authenticateToken,
  validateDeviceId,
  controller.updateDeviceThreshold
);

// ─── GET DEVICES ──────────────────────────────────────────────────────────
router.get(
  "/devices",
  authenticateToken,
  controller.getDevices
);

// ─── GET SINGLE DEVICE ────────────────────────────────────────────────────
router.get(
  "/device/:device_id",
  authenticateToken,
  validateDeviceId,
  controller.getDevice
);

// ─── REMOVE DEVICE ────────────────────────────────────────────────────────
router.delete(
  "/device/:device_id",
  authenticateToken,
  validateDeviceId,
  controller.removeDevice
);

// ─── PUBLIC DATA ENDPOINTS ────────────────────────────────────────────────
router.get("/all-daily-runtime", controller.getAllDailyRuntime);
router.get("/threshold/:device_id", validateDeviceId, controller.getThreshold);
router.get("/runtime/:device_id", validateDeviceId, controller.getRuntime);
router.get("/cycles/:device_id", validateDeviceId, controller.getCycles);
router.get(
  "/daily-summary/:device_id",
  validateDeviceId,
  controller.getDailySummary
);

module.exports = router;