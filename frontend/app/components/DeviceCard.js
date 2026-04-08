'use client';

import Link from 'next/link';

export default function DeviceCard({ device, runtime, status }) {
  const isOn = status?.current_status === 'ON';
  const eff = parseFloat(runtime?.efficiency_percent || 0);

  return (
    <div className="d-card">
      <div className="dc-top">
        <div className="dc-icon">⚙️</div>
        <div className="dc-info">
          <div className="dc-name">{device.machine_name}</div>
          <div className="dc-id">ID: {device.device_id}</div>
        </div>
        <div className={`sbadge ${isOn ? 'on' : 'off'}`}>
          <span className="dot"></span>
          {isOn ? 'RUNNING' : 'OFFLINE'}
        </div>
      </div>
      <div className="dc-sep"></div>
      <div className="dc-metrics">
        <div className="dc-m">
          <div className="dc-ml">Runtime</div>
          <div className="dc-mv" style={{ color: 'var(--green)' }}>{runtime?.runtime_formatted || '0s'}</div>
        </div>
        <div className="dc-m">
          <div className="dc-ml">Cycles</div>
          <div className="dc-mv" style={{ color: 'var(--accent)' }}>{status?.today_cycles || '–'}</div>
        </div>
        <div className="dc-m">
          <div className="dc-ml">Efficiency</div>
          <div className="dc-mv" style={{ color: 'var(--yellow)' }}>{eff.toFixed(1)}%</div>
        </div>
      </div>
      <div className="dc-eff">
        <div className="eff-row">
          <span>Daily Efficiency</span>
          <span>{eff.toFixed(1)}%</span>
        </div>
        <div className="eff-track">
          <div className="eff-fill" style={{ width: `${Math.min(100, eff)}%` }}></div>
        </div>
      </div>
      <div className="dc-foot">
        <Link href={`/device/${encodeURIComponent(device.device_id)}`} className="view-lnk">
          View Details →
        </Link>
      </div>
    </div>
  );
}