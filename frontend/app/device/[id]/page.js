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
    
    const maxSec = Math.max(...weeklyData.map(d => d.runtime_seconds), 1);
    return weeklyData.map(day => {
      const pct = (day.runtime_seconds / maxSec * 100).toFixed(1);
      const dObj = new Date(day.date + 'T00:00:00');
      const isToday = day.date === getTodayString();
      return `<div class="weekly-col">
        <div class="weekly-bar-wrap">
          <div class="weekly-bar ${isToday ? 'today' : ''}" style="height: ${Math.max(2, parseFloat(pct))}%" data-date="${day.date}">
            <div class="bar-tooltip">${day.date}<br>Runtime: ${day.runtime_formatted}<br>Cycles: ${day.cycle_count}<br>Eff: ${day.efficiency_percent}%</div>
          </div>
        </div>
        <div class="weekly-day">${dObj.toLocaleDateString('en-US', { weekday: 'short' })} ${dObj.getDate()}</div>
        <div class="weekly-hours" style="color: ${isToday ? 'var(--green)' : 'var(--accent)'}">${day.runtime_hours}h</div>
      </div>`;
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
            <button className="nav-btn" onClick={() => {
              const d = new Date(dailyDate + 'T00:00:00');
              d.setDate(d.getDate() - 1);
              const target = d.toISOString().split('T')[0];
              const today = getTodayString();
              if (target <= today) {
                setDailyDate(target);
                loadDaily(target);
              }
            }}>◀</button>
            <button className="nav-btn" onClick={() => {
              const d = new Date(dailyDate + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              const target = d.toISOString().split('T')[0];
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
}