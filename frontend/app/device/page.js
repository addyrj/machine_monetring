// app/devices/page.js
// ENHANCED: Integrated modals, improved state sync, better UX
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";

// ─── WiFi Configuration Modal ──────────────────────────────────────────────────
function WiFiConfigModal({ device, onSuccess, onClose }) {
  const { getAuthHeaders, logout } = useAuth();
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState({ type: "", msg: "" });

  const handleSave = async () => {
    if (!wifiSsid.trim()) {
      setFlash({ type: "err", msg: "WiFi SSID is required" });
      return;
    }

    setLoading(true);
    setFlash({ type: "", msg: "" });

    try {
      const res = await fetch(
        `/api/device/${encodeURIComponent(device.device_id)}/wifi`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            wifi_ssid: wifiSsid.trim(),
            wifi_password: wifiPassword.trim(),
          }),
        },
      );

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setFlash({
          type: "err",
          msg: data.error || "Failed to save WiFi config",
        });
        setLoading(false);
        return;
      }

      onSuccess(data);
    } catch (err) {
      setFlash({ type: "err", msg: "Network error" });
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border2)",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              Update WiFi Configuration
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              Device:{" "}
              <span style={{ color: "var(--accent2)", fontWeight: 600 }}>
                {device.machine_name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: "1.2rem",
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Device ID */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "var(--card2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "1.2rem" }}>📱</div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.72rem",
              color: "var(--muted)",
            }}
          >
            {device.device_id}
          </div>
        </div>

        {/* WiFi SSID */}
        <div className="form-group">
          <label className="form-label">WiFi Network Name (SSID)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Your WiFi network name"
            value={wifiSsid}
            onChange={(e) => setWifiSsid(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* WiFi Password */}
        <div className="form-group">
          <label className="form-label">WiFi Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              className="form-input"
              placeholder="Your WiFi password"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              autoComplete="off"
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "0.75rem",
                padding: "4px",
              }}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {flash.msg && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Saving…
              </>
            ) : (
              "📡 Save & Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Threshold Modal ───────────────────────────────────────────────────────────
function ThresholdModal({ device, currentThreshold = 5, onSuccess, onClose }) {
  const { getAuthHeaders, logout } = useAuth();
  const [threshold, setThreshold] = useState(currentThreshold);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState({ type: "", msg: "" });

  const MIN = 0;
  const MAX = 99;

  const handleSave = async () => {
    setLoading(true);
    setFlash({ type: "", msg: "" });

    try {
      const res = await fetch(
        `/api/device/${encodeURIComponent(device.device_id)}/threshold`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ current_threshold: threshold }),
        },
      );

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setFlash({ type: "err", msg: data.error || "Failed to set threshold" });
        setLoading(false);
        return;
      }

      onSuccess(data);
    } catch (err) {
      setFlash({ type: "err", msg: "Network error" });
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border2)",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              Set Current Threshold
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              Device:{" "}
              <span style={{ color: "var(--accent2)", fontWeight: 600 }}>
                {device.machine_name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: "1.2rem",
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Device ID */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "var(--card2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "1.2rem" }}>⚙️</div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.72rem",
              color: "var(--muted)",
            }}
          >
            {device.device_id}
          </div>
        </div>

        {/* Big threshold display */}
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              color: "var(--accent2)",
              lineHeight: 1,
            }}
          >
            {threshold.toFixed(1)}
          </div>
          <div
            style={{ fontSize: "1rem", color: "var(--muted)", marginTop: 4 }}
          >
            Amperes (A)
          </div>
        </div>

        {/* Slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step="0.5"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.7rem",
              color: "var(--muted2)",
            }}
          >
            <span>{MIN} A</span>
            <span>{MAX} A</span>
          </div>
        </div>

        {/* Info row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {[
            {
              label: "Below threshold",
              value: `0 – ${threshold.toFixed(1)} A`,
              color: "var(--muted)",
              status: "OFF",
            },
            {
              label: "Above threshold",
              value: `${threshold.toFixed(1)} – ${MAX} A`,
              color: "var(--green)",
              status: "ON",
            },
          ].map((item) => (
            <div
              key={item.status}
              style={{
                padding: "10px 12px",
                background: "var(--card2)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: item.color,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {flash.msg && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Saving…
              </>
            ) : (
              "✅ Save Threshold"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DEVICES PAGE ─────────────────────────────────────────────────────────
export default function DevicesPage() {
  const { getAuthHeaders, logout } = useAuth();
  const router = useRouter();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState({ type: "", msg: "" });
  const [wifiModalDevice, setWifiModalDevice] = useState(null);
  const [thresholdModalDevice, setThresholdModalDevice] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, pending, unregistered

  const loadDevices = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/devices", { headers });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      const data = await res.json();
      const devicesList = data.devices || data;
      setDevices(devicesList);
    } catch (err) {
      console.error("Failed to load devices:", err);
      setFlash({ type: "err", msg: "Failed to load devices" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    // Refresh every 30 seconds for live updates
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRemoveDevice = async (deviceId) => {
    if (
      !confirm(
        "Are you sure you want to remove this device? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/device/${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers,
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (res.ok) {
        setDevices(devices.filter((d) => d.device_id !== deviceId));
        setFlash({
          type: "ok",
          msg: `Device ${deviceId} removed successfully`,
        });
      } else {
        setFlash({ type: "err", msg: "Failed to remove device" });
      }
    } catch (err) {
      setFlash({ type: "err", msg: "Network error" });
    }
  };

  const filteredDevices = devices.filter((d) => {
    if (filterStatus === "all") return true;
    return (d.status || "active") === filterStatus;
  });

  const statusColors = {
    active: { bg: "var(--green-bg)", color: "var(--green)", text: "Active" },
    pending_confirmation: {
      bg: "var(--amber-bg)",
      color: "var(--amber)",
      text: "Pending Confirmation",
    },
    unregistered: {
      bg: "rgba(107,114,128,0.1)",
      color: "var(--muted)",
      text: "Unregistered",
    },
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="devices-main" style={{ padding: "40px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div className="loading-spinner"></div>
            <p>Loading devices...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="devices-main">
        <div className="page-header">
          <div>
            <h1>Device Management</h1>
            <p>Configure WiFi, thresholds, and manage all registered devices</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => router.push("/setup")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            Add Device
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {[
            { value: "all", label: `All (${devices.length})` },
            {
              value: "active",
              label: `Active (${devices.filter((d) => (d.status || "active") === "active").length})`,
            },
            {
              value: "pending_confirmation",
              label: `Pending (${devices.filter((d) => d.status === "pending_confirmation").length})`,
            },
            {
              value: "unregistered",
              label: `Unregistered (${devices.filter((d) => d.status === "unregistered").length})`,
            },
          ].map((tab) => (
            <button
              key={tab.value}
              className={`filter-tab ${filterStatus === tab.value ? "active" : ""}`}
              onClick={() => setFilterStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {flash.msg && (
          <div
            className={`flash ${flash.type}`}
            style={{ marginBottom: "20px" }}
          >
            {flash.msg}
          </div>
        )}

        {/* Devices Table */}
        <div className="devices-table-wrapper">
          {filteredDevices.length === 0 ? (
            <div
              className="empty-state"
              style={{ padding: "60px 20px", textAlign: "center" }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
              <p>No devices found</p>
              {filterStatus !== "all" && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setFilterStatus("all")}
                  style={{ marginTop: "10px" }}
                >
                  Clear filters
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => router.push("/setup")}
                style={{ marginTop: "10px" }}
              >
                Add Your First Device
              </button>
            </div>
          ) : (
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Machine Name</th>
                  <th>Device ID</th>
                  <th>Status</th>
                  <th>Threshold</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const statusInfo =
                    statusColors[device.status] || statusColors["active"];
                  return (
                    <tr key={device.device_id}>
                      <td className="device-name">
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            textAlign: "left",
                            cursor: "pointer",
                            fontWeight: 500,
                            fontSize: "inherit",
                            padding: 0,
                          }}
                          onClick={() =>
                            router.push(`/device/${device.device_id}`)
                          }
                        >
                          {device.machine_name}
                        </button>
                      </td>
                      <td className="device-id">
                        <code>{device.device_id}</code>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {statusInfo.text}
                        </span>
                      </td>
                      <td>
                        <code>
                          {(device.current_threshold || 0).toFixed(1)} A
                        </code>
                      </td>
                      <td className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => setWifiModalDevice(device)}
                          title="Configure WiFi"
                        >
                          📡 WiFi
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => setThresholdModalDevice(device)}
                          title="Set Threshold"
                        >
                          ⚙️ Threshold
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleRemoveDevice(device.device_id)}
                          title="Remove Device"
                        >
                          🗑️ Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* WiFi Modal */}
      {wifiModalDevice && (
        <WiFiConfigModal
          device={wifiModalDevice}
          onSuccess={(data) => {
            setWifiModalDevice(null);
            setFlash({
              type: "ok",
              msg: `WiFi config sent to ${data.device_id}`,
            });
            loadDevices();
          }}
          onClose={() => setWifiModalDevice(null)}
        />
      )}

      {/* Threshold Modal */}
      {thresholdModalDevice && (
        <ThresholdModal
          device={thresholdModalDevice}
          currentThreshold={thresholdModalDevice.current_threshold || 5}
          onSuccess={(data) => {
            setThresholdModalDevice(null);
            setFlash({
              type: "ok",
              msg: `Threshold updated to ${data.current_threshold}A`,
            });
            loadDevices();
          }}
          onClose={() => setThresholdModalDevice(null)}
        />
      )}

      <Footer />
    </>
  );
}