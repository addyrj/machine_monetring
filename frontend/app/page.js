// app/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Footer from './components/Footer';
import DeviceCard from './components/DeviceCard';
import { useAuth } from './hooks/useAuth';

export default function DashboardPage() {
  const { getAuthHeaders, logout } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [runtimes, setRuntimes] = useState({});
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, totalRuntime: 0 });

  const loadData = async () => {
    try {
      const headers = getAuthHeaders();
      
      const [devRes, rtRes] = await Promise.all([
        fetch('/api/devices', { headers }),
        fetch('/api/all-daily-runtime', { headers })
      ]);

      if (devRes.status === 401 || devRes.status === 403) {
        logout();
        return;
      }

      const devicesData = await devRes.json();
      const devices = devicesData.devices || devicesData;
      const runtimesData = await rtRes.json();

      const rtMap = {};
      runtimesData.forEach(rt => { rtMap[rt.device_id] = rt; });

      const statusPromises = devices.map(device =>
        fetch(`/api/runtime/${device.device_id}`, { headers }).then(r => r.json())
      );
      const statusArray = await Promise.all(statusPromises);
      
      const stMap = {};
      devices.forEach((device, i) => { stMap[device.device_id] = statusArray[i]; });

      let online = 0, offline = 0, totalSec = 0;
      devices.forEach(device => {
        if (stMap[device.device_id]?.current_status === 'ON') online++;
        else offline++;
        totalSec += rtMap[device.device_id]?.total_seconds || 0;
      });

      setStats({ total: devices.length, online, offline, totalRuntime: totalSec / 3600 });
      setDevices(devices);
      setRuntimes(rtMap);
      setStatuses(stMap);
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main className="dashboard-main">
          <div className="device-grid">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '235px' }}></div>)}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="dashboard-main">
        <div className="page-head">
          <div>
            <h1>All <span>Devices</span></h1>
            <div className="page-hint">Last refreshed: {lastRefresh} · auto every 30s</div>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/setup')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            Add Device
          </button>
        </div>

        <div className="summary-strip">
          <div className="stat-card blue"><div className="stat-label">Total Devices</div><div className="stat-value">{stats.total}</div></div>
          <div className="stat-card green"><div className="stat-label">Online Now</div><div className="stat-value">{stats.online}</div></div>
          <div className="stat-card red"><div className="stat-label">Offline Now</div><div className="stat-value">{stats.offline}</div></div>
          <div className="stat-card yellow"><div className="stat-label">Total Runtime Today</div><div className="stat-value">{stats.totalRuntime.toFixed(1)}h</div><div className="stat-sub">all devices</div></div>
        </div>

        <div className="device-grid">
          {devices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏭</div>
              <p>No devices registered yet.</p>
              <button className="btn btn-primary" onClick={() => router.push('/setup')}>Add First Device</button>
            </div>
          ) : (
            devices.map(device => (
              <DeviceCard key={device.device_id} device={device} runtime={runtimes[device.device_id]} status={statuses[device.device_id]} />
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}