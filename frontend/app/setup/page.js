'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import jsQR from 'jsqr';

export default function SetupPage() {
  const { getAuthHeaders, logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [scannedId, setScannedId] = useState('');
  const [regName, setRegName] = useState('');
  const [minCurrent, setMinCurrent] = useState(0);
  const [maxCurrent, setMaxCurrent] = useState(20);
  const [threshold, setThreshold] = useState(10);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [flash, setFlash] = useState({ type: '', message: '' });
  const [qrStatus, setQrStatus] = useState('📷 Point camera at device QR code…');
  const [qrScanning, setQrScanning] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanFrame();
      }
    } catch (e) {
      setQrStatus('⚠️ Camera unavailable — enter ID manually');
      setQrScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !qrScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });
      
      if (code && code.data.trim()) {
        stopCamera();
        setQrScanning(false);
        setScannedId(code.data.trim());
        setQrStatus(`✅ QR scanned: ${code.data.trim()}`);
      }
    }
    
    requestAnimationFrame(scanFrame);
  };

  const goStep = (n) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Safe number parser
  const safeParseFloat = (value, defaultValue = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const handleMinChange = (e) => {
    const value = safeParseFloat(e.target.value, 0);
    setMinCurrent(value);
    // Adjust threshold if needed
    if (value >= threshold) {
      setThreshold(value + 1);
    }
  };

  const handleMaxChange = (e) => {
    const value = safeParseFloat(e.target.value, 20);
    setMaxCurrent(value);
    // Adjust threshold if needed
    if (value <= threshold) {
      setThreshold(value - 1);
    }
  };

  const handleThresholdChange = (e) => {
    const value = safeParseFloat(e.target.value, 10);
    setThreshold(value);
  };

  const handleRegister = async () => {
    if (!scannedId) {
      setFlash({ type: 'err', message: 'Please scan QR or enter a Device ID.' });
      return;
    }
    if (!regName) {
      setFlash({ type: 'err', message: 'Machine name is required.' });
      return;
    }
    if (minCurrent >= maxCurrent) {
      setFlash({ type: 'err', message: 'Max current must be greater than min.' });
      return;
    }

    setFlash({ type: 'info', message: 'Registering…' });
    
    try {
      const midVal = (minCurrent + maxCurrent) / 2;
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          device_id: scannedId,
          machine_name: regName,
          min_current: minCurrent,
          max_current: maxCurrent,
          current_threshold: midVal
        })
      });
      
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      
      const data = await res.json();
      if (!res.ok) {
        setFlash({ type: 'err', message: data.error });
        return;
      }
      
      setFlash({ type: 'ok', message: '✅ Device registered!' });
      setThreshold(midVal);
      setTimeout(() => goStep(3), 800);
    } catch (e) {
      setFlash({ type: 'err', message: 'Network error.' });
    }
  };

  const handleConfigure = async () => {
    setFlash({ type: 'info', message: '📡 Sending config to device…' });
    
    try {
      const body = { current_threshold: threshold };
      if (wifiSsid) body.wifi_ssid = wifiSsid;
      if (wifiPassword) body.wifi_password = wifiPassword;
      
      const res = await fetch(`/api/device/${encodeURIComponent(scannedId)}/push-config`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      
      const data = await res.json();
      if (!res.ok) {
        setFlash({ type: 'err', message: data.error });
        return;
      }
      
      goStep(4);
    } catch (e) {
      setFlash({ type: 'err', message: 'Network error.' });
    }
  };

  const startOver = () => {
    setScannedId('');
    setRegName('');
    setWifiSsid('');
    setWifiPassword('');
    setMinCurrent(0);
    setMaxCurrent(20);
    setThreshold(10);
    setFlash({ type: '', message: '' });
    setQrStatus('📷 Point camera at device QR code…');
    setQrScanning(true);
    setStep(1);
    startCamera();
  };

  return (
    <>
      <Header />
      <main className="setup-main">
        <h1 className="setup-title">Add New Device</h1>
        <p className="setup-sub">Scan the QR code on your device, register it, then push WiFi credentials and current threshold over MQTT.</p>

        <div className="steps">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
              <div className="step-number">{i === 4 ? '✓' : i}</div>
              <div className="step-label">{i === 1 ? 'Scan QR' : i === 2 ? 'Register' : i === 3 ? 'Configure' : 'Done'}</div>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        <div className={`panel card ${step === 1 ? 'active' : ''}`}>
          <div className="qr-outer">
            <div className="qr-wrap">
              <video ref={videoRef} className="qr-video" autoPlay playsInline muted></video>
              <div className="qr-overlay"><div className="qr-frame"></div></div>
            </div>
            <div className={`qr-status ${qrScanning ? 'scanning' : qrStatus.includes('✅') ? 'found' : ''}`}>{qrStatus}</div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          <div className="divider"><span>or enter manually</span></div>
          <div className="form-group">
            <label>Device ID</label>
            <input 
              placeholder="e.g. 1234" 
              value={scannedId} 
              onChange={(e) => setScannedId(e.target.value)} 
            />
          </div>
          {flash.type === 'err' && flash.message && <div className={`flash ${flash.type}`}>{flash.message}</div>}
          <button className="btn btn-primary" onClick={() => goStep(2)} disabled={!scannedId}>Continue →</button>
        </div>

        {/* Step 2 */}
        <div className={`panel card ${step === 2 ? 'active' : ''}`}>
          <div className="form-group">
            <label>Device ID</label>
            <input value={scannedId} readOnly />
          </div>
          <div className="form-group">
            <label>Machine Name</label>
            <input 
              placeholder="e.g. Pump Motor A" 
              value={regName} 
              onChange={(e) => setRegName(e.target.value)} 
            />
          </div>
          <div className="row-2">
            <div className="form-group">
              <label>Min Current (A)</label>
              <input 
                type="number" 
                value={minCurrent} 
                onChange={handleMinChange}
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Max Current (A)</label>
              <input 
                type="number" 
                value={maxCurrent} 
                onChange={handleMaxChange}
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
          <p className="hint">Min/Max define the valid range for the threshold slider in the next step.</p>
          {flash.message && <div className={`flash ${flash.type}`}>{flash.message}</div>}
          <div className="button-row">
            <button className="btn btn-ghost" onClick={() => goStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={handleRegister}>Register Device →</button>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`panel card ${step === 3 ? 'active' : ''}`}>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '22px' }}>
            This config is sent directly to <strong>{scannedId}</strong> via MQTT. 
            The device will apply these settings immediately.
          </p>
          <div className="form-group">
            <label>WiFi SSID</label>
            <input 
              placeholder="Your WiFi network name" 
              value={wifiSsid} 
              onChange={(e) => setWifiSsid(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>WiFi Password</label>
            <input 
              type="password" 
              placeholder="Your WiFi password" 
              value={wifiPassword} 
              onChange={(e) => setWifiPassword(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Current Threshold</label>
            <div className="threshold-wrap">
              <p className="hint" style={{ margin: '0 0 4px' }}>Machine is ON when current exceeds this value</p>
              <div className="threshold-row">
                <input 
                  type="range" 
                  min={minCurrent} 
                  max={maxCurrent} 
                  step="0.1" 
                  value={threshold} 
                  onChange={handleThresholdChange}
                />
                <div className="threshold-value">{threshold.toFixed(1)} A</div>
              </div>
            </div>
          </div>
          {flash.message && <div className={`flash ${flash.type}`}>{flash.message}</div>}
          <div className="button-row">
            <button className="btn btn-ghost" onClick={() => goStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={handleConfigure}>📡 Send Config to Device</button>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`panel card ${step === 4 ? 'active' : ''}`} style={{ textAlign: 'center', padding: '36px 28px' }}>
          <div className="done-icon">✅</div>
          <div className="done-title">Device Ready!</div>
          <div className="done-sub">
            Configuration has been sent to the device via MQTT.<br />
            The device will apply it and start sending data.
          </div>
          <div className="summary-grid" style={{ textAlign: 'left' }}>
            <div className="summary-item">
              <div className="summary-label">Device ID</div>
              <div className="summary-value">{scannedId}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Machine</div>
              <div className="summary-value">{regName}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Threshold</div>
              <div className="summary-value">{threshold.toFixed(1)} A</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">WiFi SSID</div>
              <div className="summary-value">{wifiSsid || '(not set)'}</div>
            </div>
          </div>
          <div className="button-row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => router.push('/')} style={{ maxWidth: '200px' }}>
              Go to Dashboard
            </button>
            <button className="btn btn-ghost" onClick={startOver} style={{ maxWidth: '200px' }}>
              Add Another
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}