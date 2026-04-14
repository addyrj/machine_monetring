// app/components/DeviceCard.js
'use client';
import Link from 'next/link';

export default function DeviceCard({ device, runtime, status }) {
  const isOn = status?.current_status === 'ON';
  const eff  = parseFloat(runtime?.efficiency_percent || 0);

  return (
    <div className="d-card">
      <div className="dc-top">
        <div className="dc-icon">⚙️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dc-name">{device.machine_name}</div>
          <div className="dc-id">{device.device_id}</div>
        </div>
        <span className={`badge ${isOn ? 'badge-on' : 'badge-off'}`}>
          {isOn ? <span className="dot-pulse"></span> : <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--muted)', display:'inline-block' }}></span>}
          {isOn ? 'Running' : 'Offline'}
        </span>
      </div>

      <div className="dc-sep"></div>

      <div className="dc-metrics">
        <div className="dc-m">
          <div className="dc-ml">Runtime</div>
          <div className="dc-mv" style={{ color: 'var(--green)' }}>{runtime?.runtime_formatted || '0s'}</div>
        </div>
        <div className="dc-m">
          <div className="dc-ml">Cycles</div>
          <div className="dc-mv" style={{ color: 'var(--blue)' }}>{status?.today_cycles ?? '–'}</div>
        </div>
        <div className="dc-m">
          <div className="dc-ml">Efficiency</div>
          <div className="dc-mv" style={{ color: 'var(--amber)' }}>{eff.toFixed(1)}%</div>
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
// app/components/Footer.js
'use client';
export default function Footer() {
  return (
    <footer>
      MachineTrack · {new Date().getFullYear()}
    </footer>
  );
}// // app/components/Header.js
// 'use client';
// import Link from 'next/link';
// import { useEffect, useState } from 'react';
// import { useAuth } from '../hooks/useAuth';

// export default function Header() {
//   const [clock, setClock] = useState('');
//   const [username, setUsername] = useState('');
//   const [mounted, setMounted] = useState(false);
//   const { logout } = useAuth();

//   useEffect(() => {
//     setMounted(true);
//     setUsername(localStorage.getItem('username') || 'User');
//     const tick = () => setClock(new Date().toLocaleString('en-IN', {
//       weekday:'short', day:'2-digit', month:'short',
//       hour:'2-digit', minute:'2-digit', second:'2-digit'
//     }));
//     tick();
//     const t = setInterval(tick, 1000);
//     return () => clearInterval(t);
//   }, []);

//   return (
//     <header className="header">
//       <div className="header-inner">
//         <Link href="/" className="logo">
//           <div className="logo-mark">
//             <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//               <path d="M3 13l3.5-5.5 3 3.5 3.5-7 3.5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
//             </svg>
//           </div>
//           <span className="logo-text">MachineTrack</span>
//         </Link>

//         <div className="header-right">
//           {mounted && <span className="clock">{clock}</span>}
//           <div className="live-pill">
//             <div className="dot-pulse"></div>
//             LIVE
//           </div>
//           {mounted && (
//             <div className="user-chip">
//               <span className="username">{username}</span>
//               <button className="logout-btn" onClick={logout}>Logout</button>
//             </div>
//           )}
//         </div>
//       </div>
//     </header>
//   );
// }
// app/components/Header.js
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const router = useRouter();
  const [clock, setClock] = useState('');
  const [username, setUsername] = useState('');
  const [mounted, setMounted] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem('username') || 'User');
    const tick = () => setClock(new Date().toLocaleString('en-IN', {
      weekday:'short', day:'2-digit', month:'short',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 13l3.5-5.5 3 3.5 3.5-7 3.5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="logo-text">MachineTrack</span>
          <span className="logo-text-short">MT</span>
        </Link>

        <div className="header-right">
          {mounted && <span className="clock">{clock}</span>}
          <div className="live-pill">
            <div className="dot-pulse"></div>
            LIVE
          </div>
          <button 
            className="qr-nav-btn" 
            onClick={() => router.push('/qr-generate')}
            title="Generate QR Codes"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="qr-text">QR</span>
          </button>
          {mounted && (
            <div className="user-chip">
              <span className="username">{username}</span>
              <button className="logout-btn" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
// app/device/[id]/page.js 
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../hooks/useAuth';

export default function DevicePage() {
  const params = useParams();
  const deviceId = params.id;
  const { getAuthHeaders, logout } = useAuth();
  
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyDate, setDailyDate] = useState('');
  const [wkStart, setWkStart] = useState(null);
  const [moDate, setMoDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pgCycles, setPgCycles] = useState([]);
  const [pgPage, setPgPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const PG_SIZE = 10;

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const formatDate = (d) => {
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const formatSeconds = (s) => {
    if (s <= 0) return '0s';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };
  
  const getHeatColor = (p) => {
    if (p <= 0) return 'var(--border)';
    if (p < 20) return '#ef4444';
    if (p < 40) return '#f59e0b';
    if (p < 70) return '#3b82f6';
    return '#10b981';
  };

  // Initialize dates after mount
  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    setDailyDate(getTodayString());
    setWkStart(getMonday(today));
    setMoDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  const loadHero = async () => {
    try {
      const headers = getAuthHeaders();
      const [devRes, rtRes] = await Promise.all([
        fetch('/api/devices', { headers }),
        fetch(`/api/runtime/${deviceId}`, { headers })
      ]);
      if (devRes.status === 401 || devRes.status === 403) { 
        logout(); 
        return; 
      }
      const devs = await devRes.json();
      const rt = await rtRes.json();
      const devices = devs.devices || devs;
      setDevice(devices.find(d => d.device_id == deviceId));
      setStatus(rt);
    } catch (e) { 
      console.error(e); 
    }
  };

  const loadDaily = async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/cycles/${deviceId}?date=${date}`, { headers });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      const data = await res.json();
      setDailyData(data);
      setPgCycles([...(data.cycles || [])].reverse());
      setPgPage(1);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadWeekly = async () => {
    if (!wkStart) return;
    try {
      const headers = getAuthHeaders();
      const end = new Date(wkStart);
      end.setDate(end.getDate() + 6);
      const res = await fetch(`/api/daily-summary/${deviceId}?start=${wkStart.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`, { headers });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      const data = await res.json();
      setWeeklyData(data.days || []);
    } catch (e) { 
      console.error(e); 
    }
  };

  const loadMonthly = async () => {
    if (!moDate) return;
    try {
      const headers = getAuthHeaders();
      const y = moDate.getFullYear();
      const m = moDate.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const startStr = `${y}-${String(m+1).padStart(2,'0')}-01`;
      const endStr = `${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
      const res = await fetch(`/api/daily-summary/${deviceId}?start=${startStr}&end=${endStr}`, { headers });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      const data = await res.json();
      setMonthlyData(data.days || []);
    } catch (e) { 
      console.error(e); 
    }
  };

  // Load initial data after mount
  useEffect(() => {
    if (!isMounted) return;
    
    loadHero();
    if (dailyDate) {
      loadDaily(dailyDate);
    }
  }, [isMounted, deviceId]);

  // Load weekly/monthly data when tab changes
  useEffect(() => {
    if (!isMounted) return;
    
    if (activeTab === 'weekly' && wkStart) {
      loadWeekly();
    } else if (activeTab === 'monthly' && moDate) {
      loadMonthly();
    }
  }, [activeTab, wkStart, moDate, isMounted]);

  // Auto-refresh hero every 15 seconds
  useEffect(() => {
    if (!isMounted) return;
    
    const interval = setInterval(loadHero, 15000);
    return () => clearInterval(interval);
  }, [isMounted]);

  const renderTimeline = () => {
    if (!dailyData?.cycles?.length) {
      return <div className="no-data">No activity on this date</div>;
    }
    return dailyData.cycles.map((c, idx) => (
      <div 
        key={idx} 
        className={`timeline-segment ${c.isRunning ? 'running' : ''}`}
        style={{ left: `${c.startPercent}%`, width: `${Math.max(0.15, parseFloat(c.widthPercent))}%` }}
        title={`Cycle #${c.cycleNumber}: ${c.startTime} → ${c.endTime || 'running'} (${c.durationFormatted})`} 
      />
    ));
  };

  const renderCycleTable = () => {
    if (!pgCycles.length) {
      return <div className="no-data">No cycles recorded for this date.</div>;
    }
    
    const total = pgCycles.length;
    const pages = Math.ceil(total / PG_SIZE);
    const start = (pgPage - 1) * PG_SIZE;
    const slice = pgCycles.slice(start, start + PG_SIZE);
    
    const rows = slice.map((c, i) => {
      const prev = i > 0 ? slice[i-1] : null;
      let gap = '–';
      if (!c.isRunning && prev && !prev.isRunning) {
        try { 
          const diff = Math.floor((new Date(`${dailyDate} ${prev.startTime}`) - new Date(`${dailyDate} ${c.endTime}`)) / 1000);
          if (!isNaN(diff) && diff >= 0) gap = formatSeconds(diff);
        } catch { 
          gap = '–'; 
        }
      }
      return `<tr>
        <td style="color:var(--muted)">${c.cycleNumber}</td>
        <td style="color:var(--green)">${c.startTime}</td>
        <td>${c.endTime ? c.endTime : '<span class="run-badge">● Running</span>'}</td>
        <td style="color:var(--yellow);font-weight:700">${c.durationFormatted}</td>
        <td style="color:var(--muted)">${gap}</td>
      </tr>`;
    }).join('');
    
    const paginationHtml = pages > 1 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border);background:var(--card2)">
        <span style="font-size:.75rem;color:var(--muted)">Showing ${start + 1}–${Math.min(start + PG_SIZE, total)} of ${total} cycles (latest first)</span>
        <div style="display:flex;gap:6px">
          <button class="page-prev" ${pgPage === 1 ? 'disabled' : ''} style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:${pgPage === 1 ? 'var(--card)' : 'var(--accent)'};color:${pgPage === 1 ? 'var(--muted)' : '#fff'};cursor:pointer;font-size:.78rem;font-weight:600">◀ Prev</button>
          <span style="padding:5px 12px;font-size:.78rem;color:var(--muted)">${pgPage} / ${pages}</span>
          <button class="page-next" ${pgPage === pages ? 'disabled' : ''} style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:${pgPage === pages ? 'var(--card)' : 'var(--accent)'};color:${pgPage === pages ? 'var(--muted)' : '#fff'};cursor:pointer;font-size:.78rem;font-weight:600">Next ▶</button>
        </div>
      </div>
    ` : `<div style="padding:10px 16px;border-top:1px solid var(--border);font-size:.75rem;color:var(--muted)">${total} cycle${total !== 1 ? 's' : ''} · latest first</div>`;
    
    return `
      <table class="data-table">
        <thead>
          <tr><th>#</th><th>Start Time</th><th>End Time</th><th>ON Duration</th><th>OFF Gap (next)</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${paginationHtml}
    `;
  };

  const renderWeeklyBars = () => {
  if (!weeklyData.length) return '<div class="no-data">No data for this week</div>';
  
  const maxSec = Math.max(...weeklyData.map(d => d.runtime_seconds), 0.1);
  
  return weeklyData.map(day => {
    // Calculate height percentage - ensure minimum visibility for zero values
    let pct = (day.runtime_seconds / maxSec) * 100;
    // If max is very small, adjust for better visibility
    if (maxSec < 60 && day.runtime_seconds === 0) {
      pct = 4; // Small visible bar for zero
    } else if (day.runtime_seconds === 0) {
      pct = 4; // Minimum visible height
    } else if (pct < 8) {
      pct = 8; // Ensure small but visible bars
    }
    
    const dObj = new Date(day.date + 'T00:00:00');
    const isToday = day.date === getTodayString();
    
    return `
      <div class="weekly-col">
        <div class="weekly-bar-wrap">
          <div class="weekly-bar ${isToday ? 'today' : ''}" style="height: ${Math.min(100, Math.max(4, pct))}%; background: ${isToday ? 'var(--accent)' : 'var(--green)'}" data-date="${day.date}">
            <div class="bar-tooltip">${day.date}<br>Runtime: ${day.runtime_formatted}<br>Cycles: ${day.cycle_count}<br>Eff: ${day.efficiency_percent}%</div>
          </div>
        </div>
        <div class="weekly-day">${dObj.toLocaleDateString('en-US', { weekday: 'short' })} ${dObj.getDate()}</div>
        <div class="weekly-hours" style="color: ${isToday ? 'var(--green)' : 'var(--accent)'}">${(day.runtime_seconds / 3600).toFixed(2)}h</div>
      </div>
    `;
  }).join('');
};

  const renderWeeklyTable = () => {
    if (!weeklyData.length) return '<div class="no-data">No data for this week</div>';
    
    const totSec = weeklyData.reduce((a, d) => a + d.runtime_seconds, 0);
    const totCy = weeklyData.reduce((a, d) => a + d.cycle_count, 0);
    const rows = weeklyData.map(day => {
      const dow = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });
      const col = getHeatColor(parseFloat(day.efficiency_percent));
      return `<tr>
        <td>${dow}</td>
        <td style="color:var(--accent)">${day.cycle_count}</td>
        <td style="color:var(--green)">${day.runtime_formatted}</td>
        <td>${day.runtime_hours}h</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:var(--card2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${day.efficiency_percent}%;background:${col};border-radius:3px"></div>
            </div>
            <span style="font-size:.72rem;color:var(--muted);min-width:36px">${day.efficiency_percent}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
    
    return `
      <table class="data-table">
        <thead><tr><th>Day</th><th>Cycles</th><th>Runtime</th><th>Hours</th><th>Efficiency</th></tr></thead>
        <tbody>
          ${rows}
          <tr style="background:var(--card2);font-weight:700">
            <td>Total / Avg</td>
            <td style="color:var(--accent)">${totCy}</td>
            <td style="color:var(--green)">${formatSeconds(totSec)}</td>
            <td>${(totSec/3600).toFixed(2)}h</td>
            <td style="color:var(--muted)">–</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  const renderCalendar = () => {
    // CRITICAL FIX: Return early if moDate is null
    if (!moDate) {
      return '<div class="loading">Loading calendar...</div>';
    }
    
    const mp = {};
    monthlyData.forEach(d => { mp[d.date] = d; });
    const firstDow = new Date(moDate.getFullYear(), moDate.getMonth(), 1).getDay();
    const lastDay = new Date(moDate.getFullYear(), moDate.getMonth() + 1, 0).getDate();
    let html = '';
    
    for (let i = 0; i < firstDow; i++) {
      html += '<div class="calendar-cell empty"><div class="calendar-day"></div></div>';
    }
    
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${moDate.getFullYear()}-${String(moDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = mp[dateStr] || { runtime_seconds: 0, cycle_count: 0, runtime_formatted: '–', efficiency_percent: '0.0' };
      const isToday = dateStr === getTodayString();
      const col = getHeatColor(parseFloat(info.efficiency_percent));
      
      html += `
        <div class="calendar-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="calendar-day" style="color: ${isToday ? 'var(--accent)' : 'var(--text)'}">${d}</div>
          ${info.runtime_seconds > 0 ? `
            <div class="calendar-runtime">${info.runtime_formatted}</div>
            <div class="calendar-cycles">${info.cycle_count} cycle${info.cycle_count !== 1 ? 's' : ''}</div>
            <div class="calendar-heat"><div class="calendar-heat-fill" style="width: ${info.efficiency_percent}%; background: ${col}"></div></div>
          ` : `<div class="calendar-cycles" style="color:var(--border)">No data</div>`}
        </div>
      `;
    }
    
    return html;
  };

  // Set up event listeners after render
  useEffect(() => {
    if (!isMounted) return;
    
    // Handler for weekly bar clicks
    const handleWeeklyBarClick = (e) => {
      const bar = e.target.closest('.weekly-bar');
      if (bar && bar.dataset.date) {
        const date = bar.dataset.date;
        setDailyDate(date);
        loadDaily(date);
        setActiveTab('daily');
      }
    };
    
    // Handler for calendar cell clicks
    const handleCalendarClick = (e) => {
      const cell = e.target.closest('.calendar-cell');
      if (cell && cell.dataset.date && !cell.classList.contains('empty')) {
        const date = cell.dataset.date;
        setDailyDate(date);
        loadDaily(date);
        setActiveTab('daily');
      }
    };
    
    // Handler for pagination buttons
    const handlePrevPage = () => {
      const pages = Math.ceil(pgCycles.length / PG_SIZE);
      setPgPage(Math.max(1, pgPage - 1));
    };
    
    const handleNextPage = () => {
      const pages = Math.ceil(pgCycles.length / PG_SIZE);
      setPgPage(Math.min(pages, pgPage + 1));
    };
    
    // Add event listeners
    document.querySelector('.weekly-bars')?.addEventListener('click', handleWeeklyBarClick);
    document.querySelector('.calendar-grid')?.addEventListener('click', handleCalendarClick);
    document.querySelector('.page-prev')?.addEventListener('click', handlePrevPage);
    document.querySelector('.page-next')?.addEventListener('click', handleNextPage);
    
    return () => {
      document.querySelector('.weekly-bars')?.removeEventListener('click', handleWeeklyBarClick);
      document.querySelector('.calendar-grid')?.removeEventListener('click', handleCalendarClick);
      document.querySelector('.page-prev')?.removeEventListener('click', handlePrevPage);
      document.querySelector('.page-next')?.removeEventListener('click', handleNextPage);
    };
  }, [isMounted, weeklyData, monthlyData, pgCycles, pgPage]);

  // Show loading state while mounting
  if (!isMounted) {
    return (
      <>
        <Header />
        <main className="device-main">
          <div className="loading" style={{ textAlign: 'center', padding: '50px' }}>
            <div className="loading-spinner"></div>
            <p>Loading device data...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="device-main">
        <a href="/" className="back-link">← All Devices</a>
        
        <div className="hero">
          <div>
            <div className="hero-name">{device?.machine_name || 'Loading…'}</div>
            <div className="hero-sub">Device ID: <strong>{deviceId}</strong></div>
          </div>
          <div className="hero-right">
            <div className="session-pill">
              Session: <span>{status?.current_session > 0 ? status.current_session_formatted : <span style={{ color: 'var(--muted)' }}>Idle</span>}</span>
            </div>
            <div className={`big-status ${status?.current_status === 'ON' ? 'on' : 'off'}`}>
              <span className="dot"></span>
              <span>{status?.current_status || '–'}</span>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>📅 Daily</button>
          <button className={`tab ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>📆 Weekly</button>
          <button className={`tab ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>🗓️ Monthly</button>
        </div>

        {/* Daily Panel */}
        <div className={`panel ${activeTab === 'daily' ? 'active' : ''}`}>
          <div className="date-controls">
            <label>Date</label>
            <input 
              type="date" 
              className="date-input" 
              value={dailyDate} 
              onChange={(e) => { 
                const newDate = e.target.value;
                const today = getTodayString();
                if (newDate <= today) {
                  setDailyDate(newDate); 
                  loadDaily(newDate);
                }
              }} 
              max={getTodayString()}
            />
           {/* // Replace the ◀ button section: */}
<button className="nav-btn" onClick={() => {
  const [year, month, day] = dailyDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = getTodayString();
  if (target <= today) {
    setDailyDate(target);
    loadDaily(target);
  }
}}>◀</button>

<button className="nav-btn" onClick={() => {
  const [year, month, day] = dailyDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + 1);
  const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = getTodayString();
  if (target <= today) {
    setDailyDate(target);
    loadDaily(target);
  }
}}>▶</button>
            <button className="nav-btn" onClick={() => {
              const today = getTodayString();
              setDailyDate(today);
              loadDaily(today);
            }}>Today</button>
          </div>

          <div className="stat-row">
            <div className="stat-card-sm">
              <div className="stat-label">Total Cycles</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{dailyData?.totalCycles || '–'}</div>
            </div>
            <div className="stat-card-sm">
              <div className="stat-label">Total Runtime</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{dailyData?.totalRuntimeFormatted || '–'}</div>
              <div className="stat-sub">{dailyData ? (dailyData.totalRuntime / 3600).toFixed(2) + ' hrs' : ''}</div>
            </div>
            <div className="stat-card-sm">
              <div className="stat-label">Downtime</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{dailyData?.downtimeFormatted || '–'}</div>
            </div>
            <div className="stat-card-sm">
              <div className="stat-label">Efficiency</div>
              <div className="stat-value" style={{ color: 'var(--yellow)' }}>{dailyData?.efficiencyPercent || '–'}%</div>
            </div>
          </div>

          <div className="timeline-wrap">
            <div className="timeline-title">
              <span>24-Hour Activity Timeline</span>
              <span style={{ fontWeight: 400 }}>{dailyDate}</span>
            </div>
            <div className="timeline-hours">
              {[0,3,6,9,12,15,18,21,24].map(h => (
                <span key={h} style={h === 24 ? { textAlign: 'right', flex: '0 0 auto' } : {}}>{h}:00</span>
              ))}
            </div>
            <div className="timeline-bar">
              {loading ? <div className="loading"><div className="loading-spinner"></div>Loading…</div> : renderTimeline()}
            </div>
            <div className="timeline-legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }}></div>Machine ON</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: 'rgba(239,68,68,.25)' }}></div>Machine OFF</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: 'linear-gradient(90deg,var(--green),var(--yellow))' }}></div>Currently Running</div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header">
              <h3>Cycle Details</h3>
              <span className="count-badge">{dailyData?.totalCycles || 0} cycles</span>
            </div>
            <div dangerouslySetInnerHTML={{ __html: renderCycleTable() }} />
          </div>
        </div>

        {/* Weekly Panel */}
        <div className={`panel ${activeTab === 'weekly' ? 'active' : ''}`}>
          <div className="date-controls">
            <button className="nav-btn" onClick={() => {
              if (wkStart) {
                const newStart = new Date(wkStart);
                newStart.setDate(newStart.getDate() - 7);
                setWkStart(newStart);
              }
            }}>◀ Prev</button>
            <div className="range-label">
              {wkStart ? `${formatDate(wkStart)} – ${formatDate(new Date(wkStart.getTime() + 6 * 24 * 60 * 60 * 1000))}` : '–'}
            </div>
            <button className="nav-btn" onClick={() => {
              if (wkStart) {
                const newStart = new Date(wkStart);
                newStart.setDate(newStart.getDate() + 7);
                setWkStart(newStart);
              }
            }}>Next ▶</button>
            <button className="nav-btn" onClick={() => {
              setWkStart(getMonday(new Date()));
            }}>This Week</button>
          </div>

          <div className="weekly-chart">
            <div className="timeline-title">Daily Runtime (hours)</div>
            <div className="weekly-bars" dangerouslySetInnerHTML={{ __html: renderWeeklyBars() }} />
          </div>

          <div className="table-wrap">
            <div className="table-header"><h3>Weekly Summary</h3></div>
            <div dangerouslySetInnerHTML={{ __html: renderWeeklyTable() }} />
          </div>
        </div>

        {/* Monthly Panel */}
        <div className={`panel ${activeTab === 'monthly' ? 'active' : ''}`}>
          <div className="date-controls">
            <button className="nav-btn" onClick={() => {
              if (moDate) {
                setMoDate(new Date(moDate.getFullYear(), moDate.getMonth() - 1, 1));
              }
            }}>◀ Prev</button>
            <div className="range-label">
              {moDate?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button className="nav-btn" onClick={() => {
              if (moDate) {
                setMoDate(new Date(moDate.getFullYear(), moDate.getMonth() + 1, 1));
              }
            }}>Next ▶</button>
            <button className="nav-btn" onClick={() => {
              const now = new Date();
              setMoDate(new Date(now.getFullYear(), now.getMonth(), 1));
            }}>This Month</button>
          </div>

          <div className="calendar-wrap">
            <div className="calendar-dows">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-dow">{day}</div>
              ))}
            </div>
            <div className="calendar-grid" dangerouslySetInnerHTML={{ __html: renderCalendar() }} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}// app/setup/page.js 
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
}// app/qr-generate/page.js

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

export default function QRGeneratePage() {
  const { getAuthHeaders, logout } = useAuth();
  const router = useRouter();
  
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [qrDeviceId, setQrDeviceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [flash, setFlash] = useState({ type: '', msg: '' });
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'existing'

  // Load existing devices
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/devices', { headers });
      if (res.status === 401 || res.status === 403) {
        logout();
        router.push('/login');
        return;
      }
      const data = await res.json();
      const devicesList = data.devices || data;
      setDevices(devicesList);
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  };

  // Generate new QR for a new device
  const generateNewQR = async () => {
    setGenerating(true);
    setFlash({ type: '', msg: '' });
    setQrCode(null);
    
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/device/generate-qr', { headers });
      
      if (res.status === 401 || res.status === 403) {
        logout();
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate QR');
      }
      
      setQrCode(data.qr_base64);
      setQrDeviceId(data.device_id);
      setFlash({ type: 'ok', msg: `QR code generated for device: ${data.device_id}` });
    } catch (err) {
      setFlash({ type: 'err', msg: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate QR for existing device
  const regenerateQR = async () => {
    if (!selectedDevice) {
      setFlash({ type: 'err', msg: 'Please select a device' });
      return;
    }
    
    setGenerating(true);
    setFlash({ type: '', msg: '' });
    setQrCode(null);
    
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/device/qr/${encodeURIComponent(selectedDevice)}`, { headers });
      
      if (res.status === 401 || res.status === 403) {
        logout();
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate QR');
      }
      
      setQrCode(data.qr_base64);
      setQrDeviceId(data.device_id);
      setFlash({ type: 'ok', msg: `QR code regenerated for device: ${data.device_id}` });
    } catch (err) {
      setFlash({ type: 'err', msg: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Download QR as PNG
  const downloadQR = () => {
    if (!qrCode) return;
    
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qr_${qrDeviceId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print QR
  const printQR = () => {
    if (!qrCode) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Device QR - ${qrDeviceId}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              flex-direction: column;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              padding: 30px;
              border: 2px solid #ccc;
              border-radius: 16px;
            }
            img {
              width: 300px;
              height: 300px;
            }
            h2 {
              margin-top: 20px;
              color: #333;
            }
            p {
              color: #666;
              margin-top: 10px;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .qr-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCode}" alt="QR Code" />
            <h2>${qrDeviceId}</h2>
            <p>Scan this QR code to register the device</p>
            <p style="font-size: 12px;">MachineTrack Device Registration</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <Header />
      <main className="qr-generate-main">
        <div className="qr-header">
          <button className="back-link" onClick={() => router.push('/')}>
            ← Back to Dashboard
          </button>
          <h1 className="qr-title">QR Code Generator</h1>
          <p className="qr-subtitle">Generate QR codes for device registration</p>
        </div>

        {/* Tabs */}
        <div className="qr-tabs">
          <button 
            className={`qr-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('generate');
              setQrCode(null);
              setFlash({ type: '', msg: '' });
            }}
          >
            🆕 Generate New Device
          </button>
          <button 
            className={`qr-tab ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('existing');
              setQrCode(null);
              setFlash({ type: '', msg: '' });
            }}
          >
            📱 Existing Device QR
          </button>
        </div>

        <div className="qr-card">
          {/* Generate New Device Tab */}
          {activeTab === 'generate' && (
            <div className="qr-section">
              <div className="qr-info">
                <div className="info-icon">✨</div>
                <div className="info-text">
                  <h3>Generate New Device QR</h3>
                  <p>Creates a unique device ID and QR code for a new device. The device ID follows the format ISPOA26001, ISPOA26002, etc.</p>
                </div>
              </div>

              <button 
                className="btn btn-primary generate-btn"
                onClick={generateNewQR}
                disabled={generating}
              >
                {generating ? (
                  <><span className="spinner"></span> Generating...</>
                ) : (
                  <>🎯 Generate New QR Code</>
                )}
              </button>
            </div>
          )}

          {/* Existing Device Tab */}
          {activeTab === 'existing' && (
            <div className="qr-section">
              <div className="qr-info">
                <div className="info-icon">🔄</div>
                <div className="info-text">
                  <h3>Regenerate QR for Existing Device</h3>
                  <p>Select a registered device to regenerate its QR code. Useful if the original QR sticker is lost or damaged.</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select Device</label>
                <select 
                  className="form-select"
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                >
                  <option value="">-- Choose a device --</option>
                  {devices.map(device => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.machine_name} ({device.device_id})
                    </option>
                  ))}
                </select>
              </div>

              <button 
                className="btn btn-primary generate-btn"
                onClick={regenerateQR}
                disabled={generating || !selectedDevice}
              >
                {generating ? (
                  <><span className="spinner"></span> Generating...</>
                ) : (
                  <>🔄 Regenerate QR Code</>
                )}
              </button>
            </div>
          )}

          {/* Flash Message */}
          {flash.msg && (
            <div className={`flash ${flash.type}`}>
              {flash.msg}
            </div>
          )}

          {/* QR Code Display */}
          {qrCode && qrDeviceId && (
            <div className="qr-display">
              <div className="qr-display-header">
                <h3>QR Code Generated</h3>
                <span className="qr-badge">Device ID: {qrDeviceId}</span>
              </div>
              
              <div className="qr-image-container">
                <img src={qrCode} alt={`QR Code for ${qrDeviceId}`} className="qr-image-large" />
              </div>
              
              <div className="qr-actions">
                <button className="btn btn-primary" onClick={downloadQR}>
                  💾 Download PNG
                </button>
                <button className="btn btn-ghost" onClick={printQR}>
                  🖨️ Print
                </button>
                <button className="btn btn-ghost" onClick={() => {
                  navigator.clipboard.writeText(qrDeviceId);
                  setFlash({ type: 'ok', msg: 'Device ID copied to clipboard!' });
                  setTimeout(() => setFlash({ type: '', msg: '' }), 2000);
                }}>
                  📋 Copy Device ID
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Recent Devices List */}
        {devices.length > 0 && activeTab === 'existing' && (
          <div className="recent-devices">
            <h3>Registered Devices</h3>
            <div className="device-list">
              {devices.slice(0, 10).map(device => (
                <div 
                  key={device.device_id} 
                  className={`device-list-item ${selectedDevice === device.device_id ? 'selected' : ''}`}
                  onClick={() => setSelectedDevice(device.device_id)}
                >
                  <div className="device-icon">⚙️</div>
                  <div className="device-info">
                    <div className="device-name">{device.machine_name}</div>
                    <div className="device-id-mono">{device.device_id}</div>
                  </div>
                  {selectedDevice === device.device_id && <div className="check-mark">✓</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

// app/layout.js
'use client';
import './styles/globals.css';
import './styles/login.css';
import './styles/dashboard.css';
import './styles/setup.css';
import './styles/device.css';
import './styles/components.css';
import './styles/qr-generate.css';
import { useEffect, useState } from 'react';

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MachineTrack</title>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}// app/page.js
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
}/* QR Generate Page Styles */
.qr-generate-main {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 32px 24px 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
/* QR Header - Improved */
.qr-header {
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  text-decoration: none;
}

.back-link:hover {
  color: var(--accent2);
  background: rgba(99,102,241,0.1);
  transform: translateX(-2px);
}

.back-link svg {
  width: 14px;
  height: 14px;
}

.qr-title {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.qr-subtitle {
  font-size: 0.85rem;
  color: var(--muted);
}

/* Tabs */
.qr-tabs {
  display: flex;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px;
}

.qr-tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}

.qr-tab.active {
  background: var(--card2);
  color: var(--accent2);
}

.qr-tab:hover:not(.active) {
  color: var(--text);
  background: rgba(255,255,255,0.05);
}

/* QR Card */
.qr-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* QR Section */
.qr-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qr-info {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--card2);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
}

.info-icon {
  font-size: 2rem;
}

.info-text h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.info-text p {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.5;
}

/* Form Select */
.form-select {
  width: 100%;
  padding: 12px 14px;
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent);
}

.generate-btn {
  width: 100%;
  justify-content: center;
  padding: 12px;
  font-size: 1rem;
}

/* QR Display */
.qr-display {
  border-top: 1px solid var(--border);
  padding-top: 24px;
  margin-top: 8px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.qr-display-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.qr-display-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--green);
}

.qr-badge {
  padding: 4px 12px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-bd);
  border-radius: 20px;
  font-size: 0.75rem;
  font-family: 'DM Mono', monospace;
  color: var(--accent2);
}

.qr-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: var(--card2);
  border-radius: var(--radius);
  margin-bottom: 20px;
}

.qr-image-large {
  width: 250px;
  height: 250px;
  border-radius: 16px;
  background: white;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.qr-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.qr-instructions {
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
}

.qr-instructions h4 {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--accent2);
}

.qr-instructions ol {
  margin-left: 20px;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

.qr-instructions li {
  margin-bottom: 6px;
}

/* Recent Devices */
.recent-devices {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.recent-devices h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.device-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all .2s;
}

.device-list-item:hover {
  border-color: var(--accent);
  transform: translateX(4px);
}

.device-list-item.selected {
  border-color: var(--accent);
  background: rgba(59,130,246,0.1);
}

.device-icon {
  font-size: 1.2rem;
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.device-id-mono {
  font-family: 'DM Mono', monospace;
  font-size: 0.7rem;
  color: var(--muted);
}

.check-mark {
  color: var(--green);
  font-weight: bold;
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 640px) {
  .qr-generate-main {
    padding: 20px 16px 40px;
  }
  
  .qr-title {
    font-size: 1.4rem;
  }
  
  .qr-card {
    padding: 20px;
  }
  
  .qr-image-large {
    width: 180px;
    height: 180px;
  }
  
  .qr-actions {
    flex-direction: column;
  }
  
  .qr-actions .btn {
    width: 100%;
    justify-content: center;
  }
  
  .back-link {
    position: static;
    margin-bottom: 16px;
    display: inline-flex;
  }
  
  .qr-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
}/* app/styles/globals.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

:root {
  /* New theme colors - only these changed */
  --bg: #070b12;
  --surface: #0d1526;
  --card: #111d35;
  --card2: #162240;
  --border: #1c2e52;
  --border2: #253a64;
  --text: #e2e8f0;
  --muted: #5a7098;
  --muted2: #3b4d6e;
  
  /* Status colors */
  --green: #10b981;
  --green-bg: rgba(16,185,129,0.1);
  --green-bd: rgba(16,185,129,0.25);
  --red: #ef4444;
  --red-bg: rgba(239,68,68,0.1);
  --amber: #f59e0b;
  --amber-bg: rgba(245,158,11,0.1);
  --blue: #3b82f6;
  --blue-bg: rgba(59,130,246,0.1);
  
  /* Accent colors */
  --accent: #3b82f6;
  --accent2: #60a5fa;
  
  /* Layout */
  --radius: 12px;
  --radius-sm: 8px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
}

input, button, select, textarea { font-family: inherit; }

a { text-decoration: none; color: inherit; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

/* Utility */
.mono { font-family: 'DM Mono', monospace; }

/* Flash messages */
.flash {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  border: 1px solid transparent;
}
.flash.ok  { background: var(--green-bg);  border-color: var(--green-bd); color: var(--green); }
.flash.err { background: var(--red-bg);    border-color: rgba(239,68,68,0.3); color: #fca5a5; }
.flash.info{ background: var(--blue-bg);   border-color: rgba(59,130,246,0.25); color: #93c5fd; }

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.15);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.badge-on  { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-bd); }
.badge-off { background: rgba(90,112,152,0.1); color: var(--muted); border: 1px solid rgba(90,112,152,0.2); }

.dot-pulse {
  width: 6px; height: 6px; border-radius: 50%; background: var(--green);
  animation: dotpulse 1.8s ease-in-out infinite;
}
@keyframes dotpulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(.85); } }

/* Generic btn */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border2);
  background: var(--card);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .1s;
}
.btn:hover  { background: var(--card2); border-color: rgba(255,255,255,0.2); }
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn-primary:hover { background: var(--accent2); border-color: var(--accent2); }

.btn-ghost { background: transparent; }
.btn-ghost:hover { background: rgba(255,255,255,0.05); }

/* Form */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.form-input {
  padding: 10px 14px;
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.875rem;
  transition: border-color .15s, box-shadow .15s;
  width: 100%;
}
.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}
.form-input::placeholder { color: var(--muted2); }
.form-hint { font-size: 0.75rem; color: var(--muted); }

/* Skeleton */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--card) 25%, var(--card2) 50%, var(--card) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius);
}

/* Stat card */
.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
}
.stat-label { font-size: 0.72rem; color: var(--muted); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; }
.stat-value { font-size: 1.6rem; font-weight: 600; line-height: 1; }
.stat-sub   { font-size: 0.72rem; color: var(--muted); margin-top: 4px; }/* app/styles/components.css */

/* ── HEADER (RESPONSIVE WITH QR BUTTON) ─────────────────────────────────── */
.header {
  background: rgba(17,19,24,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-mark {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #e8eaf0, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.logo-text-short {
  display: none;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #e8eaf0, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

/* Header Right Section */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 1;
  min-width: 0;
}

/* Clock */
.clock {
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  color: var(--muted);
  white-space: nowrap;
}

/* Live Pill */
.live-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--green-bg);
  border: 1px solid var(--green-bd);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--green);
  letter-spacing: 0.06em;
  white-space: nowrap;
  flex-shrink: 0;
}

/* QR Nav Button */
.qr-nav-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--muted);
  flex-shrink: 0;
}

.qr-nav-btn:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-1px);
}

.qr-nav-btn svg {
  width: 14px;
  height: 14px;
}

.qr-text {
  font-size: 0.7rem;
  font-weight: 600;
}

/* User Chip */
.user-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 12px;
  border-radius: 20px;
  background: var(--card);
  border: 1px solid var(--border);
  font-size: 0.78rem;
  font-weight: 500;
  flex-shrink: 0;
}

.username {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  padding: 4px 10px;
  border-radius: 14px;
  background: var(--card2);
  border: none;
  color: var(--muted);
  font-size: 0.72rem;
  cursor: pointer;
  transition: color .15s, background .15s;
  white-space: nowrap;
}

.logout-btn:hover {
  color: var(--text);
  background: rgba(255,255,255,0.07);
}

/* ── MOBILE RESPONSIVE (max-width: 768px) ──────────────────────────────── */
@media (max-width: 768px) {
  .header-inner {
    padding: 0 12px;
    gap: 8px;
  }

  .logo-text {
    display: none;
  }
  
  .logo-text-short {
    display: inline;
  }

  .clock {
    display: none;
  }

  .live-pill {
    padding: 3px 8px;
    font-size: 0.65rem;
  }

  .qr-nav-btn {
    padding: 3px 8px;
  }
  
  .qr-text {
    display: none;
  }
  
  .qr-nav-btn svg {
    width: 16px;
    height: 16px;
  }

  .user-chip {
    padding: 3px 3px 3px 8px;
    font-size: 0.7rem;
  }

  .username {
    max-width: 70px;
  }

  .logout-btn {
    padding: 3px 8px;
    font-size: 0.68rem;
  }
}

/* ── EXTRA SMALL (max-width: 480px) ───────────────────────────────────── */
@media (max-width: 480px) {
  .header-inner {
    padding: 0 10px;
    gap: 6px;
  }

  .logo-mark {
    width: 28px;
    height: 28px;
  }

  .logo-mark svg {
    width: 14px;
    height: 14px;
  }

  .live-pill {
    padding: 2px 6px;
    font-size: 0.6rem;
  }

  .live-pill .dot-pulse {
    width: 5px;
    height: 5px;
  }

  .qr-nav-btn {
    padding: 2px 6px;
  }
  
  .qr-nav-btn svg {
    width: 14px;
    height: 14px;
  }

  .user-chip {
    padding: 2px 2px 2px 6px;
    font-size: 0.65rem;
  }

  .username {
    max-width: 55px;
  }

  .logout-btn {
    padding: 2px 6px;
    font-size: 0.62rem;
  }
}

/* ── FOOTER ─────────────────────────────────────────── */
footer {
  text-align: center;
  padding: 20px;
  font-size: 0.7rem;
  color: var(--muted2);
  border-top: 1px solid var(--border);
  margin-top: auto;
}

/* ── DEVICE CARD ─────────────────────────────────────── */
.d-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color .2s, transform .2s;
  cursor: pointer;
}
.d-card:hover { border-color: var(--border2); transform: translateY(-2px); }

.dc-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.dc-icon {
  width: 40px; height: 40px;
  background: var(--card2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.dc-name { font-size: 0.9rem; font-weight: 600; }
.dc-id   { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--muted); margin-top: 2px; }

.dc-sep { height: 1px; background: var(--border); }

.dc-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 12px 16px;
  gap: 0;
}
.dc-m { text-align: center; }
.dc-m + .dc-m { border-left: 1px solid var(--border); }
.dc-ml { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
.dc-mv { font-size: 1rem; font-weight: 600; }

.dc-eff { padding: 10px 16px 14px; }
.eff-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); margin-bottom: 6px; }
.eff-track { height: 3px; background: var(--card2); border-radius: 2px; overflow: hidden; }
.eff-fill  { height: 100%; border-radius: 2px; background: var(--green); transition: width 0.6s ease; }

.dc-foot { padding: 10px 16px; border-top: 1px solid var(--border); }
.view-lnk { font-size: 0.75rem; color: var(--muted); transition: color .15s; }
.view-lnk:hover { color: var(--accent2); }/* app/styles/dashboard.css */
.dashboard-main {
  flex: 1;
  max-width: 1320px;
  margin: 0 auto;
  width: 100%;
  padding: 28px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-head h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.page-head h1 span {
  background: linear-gradient(135deg, var(--accent2), #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-hint {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 4px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

@media (max-width: 900px) {
  .summary-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 540px) {
  .summary-strip { grid-template-columns: 1fr; }
  .dashboard-main { padding: 20px 16px; }
}

.stat-card.blue   .stat-value { color: var(--blue); }
.stat-card.green  .stat-value { color: var(--green); }
.stat-card.red    .stat-value { color: var(--red); }
.stat-card.yellow .stat-value { color: var(--amber); }

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.empty-icon { font-size: 3rem; }/* app/styles/setup.css */
.setup-main {
  flex: 1;
  max-width: 540px;
  margin: 0 auto;
  width: 100%;
  padding: 32px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.setup-header { text-align: center; }
.setup-title {
  font-size: 1.5rem;
  font-weight: 600;
}
.setup-sub {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 6px;
  line-height: 1.5;
}

/* Step indicator */
.step-track {
  display: flex;
  align-items: center;
  gap: 0;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.step-circle {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--border2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  background: var(--card);
  flex-shrink: 0;
  transition: all .2s;
}
.step-circle.active {
  border-color: var(--accent);
  color: var(--accent2);
  background: rgba(99,102,241,0.12);
}
.step-circle.done {
  border-color: var(--green);
  background: var(--green-bg);
  color: var(--green);
}
.step-lbl {
  font-size: 0.72rem;
  color: var(--muted2);
  white-space: nowrap;
}
.step-lbl.active { color: var(--text); font-weight: 500; }
.step-connector {
  flex: 1;
  height: 1px;
  background: var(--border);
  margin: 0 4px;
}

/* Panel */
.panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  display: none;
  flex-direction: column;
  gap: 20px;
}
.panel.active { display: flex; }

/* QR scanner */
.qr-viewport {
  border-radius: var(--radius);
  overflow: hidden;
  background: #000;
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}
.qr-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.qr-corners {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.qr-corners::before,
.qr-corners::after {
  content: '';
  position: absolute;
  width: 24px; height: 24px;
  border-color: #fff;
  border-style: solid;
}
.qr-corners::before { top: 12px; left: 12px; border-width: 2.5px 0 0 2.5px; border-radius: 4px 0 0 0; }
.qr-corners::after  { bottom: 12px; right: 12px; border-width: 0 2.5px 2.5px 0; border-radius: 0 0 4px 0; }
/* Extra corners via wrapper */
.qr-c2::before { content:''; position:absolute; bottom:12px; left:12px; width:24px; height:24px; border-color:#fff; border-style:solid; border-width:0 0 2.5px 2.5px; border-radius:0 0 0 4px; }
.qr-c2::after  { content:''; position:absolute; top:12px; right:12px; width:24px; height:24px; border-color:#fff; border-style:solid; border-width:2.5px 2.5px 0 0; border-radius:0 4px 0 0; }

@keyframes scanline {
  0%   { top: 14px; }
  100% { top: calc(100% - 14px); }
}
.scan-line {
  position: absolute;
  left: 14px; right: 14px;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent);
  animation: scanline 2s ease-in-out infinite alternate;
  opacity: 0.8;
}

.qr-status-row {
  text-align: center;
  font-size: 0.82rem;
  color: var(--muted);
  min-height: 20px;
}
.qr-status-row.found { color: var(--green); font-weight: 500; }

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.72rem;
  color: var(--muted2);
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.btn-row {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn-row .btn { min-width: 110px; justify-content: center; }

/* Threshold slider */
.threshold-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.threshold-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.threshold-big {
  font-size: 2.2rem;
  font-weight: 600;
  font-family: 'DM Mono', monospace;
  color: var(--accent2);
  line-height: 1;
}
.threshold-unit {
  font-size: 1rem;
  color: var(--muted);
  font-weight: 500;
}

input[type='range'] {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--card2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
  cursor: pointer;
  transition: transform .1s;
}
input[type='range']::-webkit-slider-thumb:hover { transform: scale(1.1); }
input[type='range']::-moz-range-thumb {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--muted2);
  font-family: 'DM Mono', monospace;
}

/* Done state */
.done-wrap {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}
.done-icon {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--green-bg);
  border: 1px solid var(--green-bd);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
}
.done-title { font-size: 1.4rem; font-weight: 600; }
.done-sub   { font-size: 0.82rem; color: var(--muted); line-height: 1.5; }

.summary-grid {
  width: 100%;
  background: var(--card2);
  border-radius: var(--radius-sm);
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  text-align: left;
}
.summary-item .summary-label { font-size: 0.7rem; color: var(--muted); margin-bottom: 3px; }
.summary-item .summary-value { font-size: 0.875rem; font-weight: 500; font-family: 'DM Mono', monospace; }