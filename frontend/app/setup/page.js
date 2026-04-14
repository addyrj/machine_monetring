// app/setup/page.js 
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

// ─── THRESHOLD MODAL ──────────────────────────────────────────────────────────
function ThresholdModal({ deviceId, machineName, onSuccess, onClose }) {
  const { getAuthHeaders, logout } = useAuth();
  const [threshold, setThreshold] = useState(5);
  const [flash, setFlash]         = useState({ type: '', msg: '' });
  const [loading, setLoading]     = useState(false);

  const MIN = 0;
  const MAX = 99;

  const handleSave = async () => {
    setLoading(true);
    setFlash({ type: '', msg: '' });
    try {
      const res = await fetch(`/api/device/${encodeURIComponent(deviceId)}/threshold`, {
        method:  'PUT',
        headers: getAuthHeaders(),
        body:    JSON.stringify({ current_threshold: threshold })
      });
      if (res.status === 401 || res.status === 403) { logout(); return; }
      const data = await res.json();
      if (!res.ok) { setFlash({ type: 'err', msg: data.error || 'Failed to set threshold.' }); setLoading(false); return; }
      onSuccess(threshold);
    } catch {
      setFlash({ type: 'err', msg: 'Network error.' });
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: '16px',
        padding: '28px 28px 24px',
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Set Current Threshold</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
              Machine is <span style={{ color: 'var(--green)', fontWeight: 600 }}>ON</span> when current exceeds this value
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '2px 4px' }}
          >✕</button>
        </div>

        {/* Device info pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--card2)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '1.2rem' }}>⚙️</div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{machineName}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', color: 'var(--muted)' }}>{deviceId}</div>
          </div>
        </div>

        {/* Big threshold display */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{
            fontSize: '3rem', fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            color: 'var(--accent2)',
            lineHeight: 1
          }}>
            {threshold.toFixed(1)}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--muted)', marginTop: 4 }}>Amperes (A)</div>
        </div>

        {/* Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step="0.5"
            value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.7rem', color: 'var(--muted2)'
          }}>
            <span>{MIN} A</span>
            <span>{MAX} A</span>
          </div>
        </div>

        {/* Info row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10
        }}>
          {[
            { label: 'Below threshold', value: `0 – ${threshold.toFixed(1)} A`, color: 'var(--muted)', status: 'OFF' },
            { label: 'Above threshold', value: `${threshold.toFixed(1)} – ${MAX} A`, color: 'var(--green)', status: 'ON' }
          ].map(item => (
            <div key={item.status} style={{
              padding: '10px 12px',
              background: 'var(--card2)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.78rem', fontWeight: 600, color: item.color }}>
                {item.value}
              </div>
              <div style={{
                marginTop: 6,
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.65rem',
                fontWeight: 700,
                background: item.status === 'ON' ? 'var(--green-bg)' : 'rgba(107,114,128,0.1)',
                color: item.status === 'ON' ? 'var(--green)' : 'var(--muted)',
                border: `1px solid ${item.status === 'ON' ? 'var(--green-bd)' : 'rgba(107,114,128,0.2)'}`,
                letterSpacing: '0.04em'
              }}>
                {item.status}
              </div>
            </div>
          ))}
        </div>

        {flash.msg && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
            Skip for now
          </button>
          <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner"></span> Saving…</> : '📡 Save & Push to Device'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN SETUP PAGE ──────────────────────────────────────────────────────────
export default function SetupPage() {
  const { getAuthHeaders, logout } = useAuth();
  const router = useRouter();

  // Step state: 1 = scan QR, 2 = register form, 3 = done
  const [step, setStep]           = useState(1);
  const [scannedId, setScannedId] = useState('');
  const [manualId, setManualId]   = useState('');

  // Step 2 form
  const [machineName, setMachineName]   = useState('');
  const [wifiSsid, setWifiSsid]         = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPass, setShowPass]         = useState(false);

  // Flash / loading
  const [flash, setFlash]       = useState({ type: '', msg: '' });
  const [loading, setLoading]   = useState(false);

  // QR scanner state
  const [qrStatus, setQrStatus]     = useState('');
  const [scanning, setScanning]     = useState(true);
  const [cameraErr, setCameraErr]   = useState(false);

  // Threshold modal
  const [showModal, setShowModal]           = useState(false);
  const [registeredDevice, setRegisteredDevice] = useState(null);

  // Done state
  const [doneThreshold, setDoneThreshold] = useState(null);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);

  // ── Camera / QR scanner ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Use BarcodeDetector if available (Chrome/Edge)
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      detector.detect(canvas).then(codes => {
        if (codes.length > 0) {
          const val = codes[0].rawValue?.trim();
          if (val) { handleQrDetected(val); return; }
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      }).catch(() => { rafRef.current = requestAnimationFrame(scanFrame); });
    } else {
      // Fallback: load jsQR dynamically
      import('jsqr').then(({ default: jsQR }) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code?.data?.trim()) {
          handleQrDetected(code.data.trim());
        } else {
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      }).catch(() => { rafRef.current = requestAnimationFrame(scanFrame); });
    }
  }, []); // eslint-disable-line

  const startCamera = useCallback(async () => {
    setCameraErr(false);
    setScanning(true);
    setQrStatus('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setCameraErr(true);
      setScanning(false);
      setQrStatus('Camera unavailable — enter Device ID manually below');
    }
  }, [scanFrame]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []); // eslint-disable-line

  const handleQrDetected = (value) => {
    stopCamera();
    setScanning(false);
    setScannedId(value);
    setManualId(value);
    setQrStatus(`Scanned: ${value}`);
  };

  // ── Step navigation ────────────────────────────────────────────────────────
  const goToRegister = () => {
    const id = manualId.trim() || scannedId.trim();
    if (!id) { setFlash({ type: 'err', msg: 'Please scan the QR code or enter a Device ID.' }); return; }
    setScannedId(id);
    setFlash({ type: '', msg: '' });
    stopCamera();
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBackToScan = () => {
    setStep(1);
    setFlash({ type: '', msg: '' });
    setMachineName('');
    setWifiSsid('');
    setWifiPassword('');
    setManualId(scannedId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => startCamera(), 200);
  };

  // ── Registration ───────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!machineName.trim()) { setFlash({ type: 'err', msg: 'Machine name is required.' }); return; }
    setLoading(true);
    setFlash({ type: '', msg: '' });

    try {
      const body = {
        device_id:    scannedId,
        machine_name: machineName.trim(),
      };
      if (wifiSsid.trim())     body.wifi_ssid     = wifiSsid.trim();
      if (wifiPassword.trim()) body.wifi_password = wifiPassword.trim();

      const res = await fetch('/api/register', {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify(body)
      });
      if (res.status === 401 || res.status === 403) { logout(); return; }
      const data = await res.json();
      if (!res.ok) { setFlash({ type: 'err', msg: data.error || 'Registration failed.' }); setLoading(false); return; }

      setRegisteredDevice({ device_id: scannedId, machine_name: machineName.trim() });
      setLoading(false);
      setShowModal(true); // open threshold modal
    } catch {
      setFlash({ type: 'err', msg: 'Network error.' });
      setLoading(false);
    }
  };

  // ── After threshold set (or skipped) ──────────────────────────────────────
  const handleThresholdSuccess = (val) => {
    setDoneThreshold(val);
    setShowModal(false);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleThresholdSkip = () => {
    setShowModal(false);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Start over ─────────────────────────────────────────────────────────────
  const startOver = () => {
    setStep(1);
    setScannedId('');
    setManualId('');
    setMachineName('');
    setWifiSsid('');
    setWifiPassword('');
    setFlash({ type: '', msg: '' });
    setDoneThreshold(null);
    setRegisteredDevice(null);
    setShowModal(false);
    setScanning(true);
    setTimeout(() => startCamera(), 200);
  };

  // ── Step labels ────────────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Scan QR' },
    { n: 2, label: 'Register' },
    { n: 3, label: 'Done' }
  ];

  return (
    <>
      <Header />
      <main className="setup-main">
        {/* Title */}
        <div className="setup-header">
          <h1 className="setup-title">Add New Device</h1>
          <p className="setup-sub">Scan the QR code on your device, fill in the details, then set the current threshold.</p>
        </div>

        {/* Step track */}
        <div className="step-track">
          {steps.map((s, idx) => (
            <div key={s.n} className="step-item" style={{ flex: idx < steps.length - 1 ? 1 : 'none' }}>
              <div className={`step-circle ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={`step-lbl ${step === s.n ? 'active' : ''}`}>{s.label}</span>
              {idx < steps.length - 1 && <div className="step-connector"></div>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: QR SCAN ── */}
        {step === 1 && (
          <div className="panel active">
            {/* Camera viewport */}
            <div className="qr-viewport">
              <video ref={videoRef} className="qr-video" autoPlay playsInline muted />
              <div className="qr-corners"></div>
              <div className="qr-c2"></div>
              {scanning && !cameraErr && <div className="scan-line"></div>}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* QR status */}
            <div className={`qr-status-row ${scannedId ? 'found' : ''}`}>
              {scannedId
                ? `✅ ${qrStatus}`
                : cameraErr
                  ? `⚠️ ${qrStatus}`
                  : '📷 Point camera at the QR code on your device…'
              }
            </div>

            {/* Divider */}
            <div className="divider"><span>or enter manually</span></div>

            {/* Manual entry */}
            <div className="form-group">
              <label className="form-label">Device ID</label>
              <input
                className="form-input"
                placeholder="e.g. ISPOA22001"
                value={manualId}
                onChange={e => setManualId(e.target.value)}
              />
              <span className="form-hint">Found printed on or inside your device enclosure.</span>
            </div>

            {flash.msg && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

            <div className="btn-row">
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={goToRegister}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: REGISTER ── */}
        {step === 2 && (
          <div className="panel active">
            {/* Scanned ID display */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="var(--accent2)" strokeWidth="1.4"/>
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="var(--accent2)" strokeWidth="1.4"/>
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="var(--accent2)" strokeWidth="1.4"/>
                <path d="M9 9h2v2H9zM11 11h2v2h-2zM9 13h2" stroke="var(--accent2)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 1 }}>Device ID (from QR)</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent2)' }}>
                  {scannedId}
                </div>
              </div>
            </div>

            {/* Machine name */}
            <div className="form-group">
              <label className="form-label">Machine Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. Pump Motor A, Compressor Unit 1"
                value={machineName}
                onChange={e => setMachineName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '2px 0' }}></div>

            {/* WiFi section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>
                WiFi Credentials <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>(optional — sent to device via MQTT)</span>
              </div>

              <div className="form-group">
                <label className="form-label">WiFi SSID</label>
                <input
                  className="form-input"
                  placeholder="Your network name"
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label">WiFi Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your WiFi password"
                    value={wifiPassword}
                    onChange={e => setWifiPassword(e.target.value)}
                    autoComplete="off"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--muted)',
                      cursor: 'pointer', fontSize: '0.75rem', padding: '4px'
                    }}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {flash.msg && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

            <div className="btn-row">
              <button className="btn btn-ghost" onClick={goBackToScan} disabled={loading}>← Back</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
                {loading ? <><span className="spinner"></span> Registering…</> : 'Register Device →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === 3 && (
          <div className="panel active">
            <div className="done-wrap">
              <div className="done-icon">✅</div>
              <div className="done-title">Device Ready!</div>
              <div className="done-sub">
                Your device has been registered and configured.<br/>
                It will start sending data once connected.
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Device ID</div>
                <div className="summary-value">{scannedId}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Machine Name</div>
                <div className="summary-value">{machineName}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">WiFi SSID</div>
                <div className="summary-value">{wifiSsid || '(not set)'}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Threshold</div>
                <div className="summary-value">
                  {doneThreshold !== null ? `${doneThreshold.toFixed(1)} A` : '(not set)'}
                </div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={startOver}>
                Add Another
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => router.push('/')}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── THRESHOLD MODAL ── */}
      {showModal && registeredDevice && (
        <ThresholdModal
          deviceId={registeredDevice.device_id}
          machineName={registeredDevice.machine_name}
          onSuccess={handleThresholdSuccess}
          onClose={handleThresholdSkip}
        />
      )}

      <Footer />
    </>
  );
}