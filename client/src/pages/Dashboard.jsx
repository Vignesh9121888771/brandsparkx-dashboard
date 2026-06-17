import { useEffect, useState, useMemo } from 'react';
import { getMembers, getProjects, getCapacity, getTasks, getRequests } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontWeight: '600', marginBottom: '3px', color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.fill || p.color }}>{p.name}: {p.value}%</div>)}
    </div>
  );
};

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard({ role, user, search, defaultRegion, onNavigate }) {
  const [members,  setMembers]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [requests, setRequests] = useState([]);
  const [region,   setRegion]   = useState(defaultRegion || 'All');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    Promise.all([getMembers(), getProjects(), getCapacity(), getTasks(), getRequests()])
      .then(([memRes, projRes, capRes, taskRes, reqRes]) => {
        setMembers(memRes.data.data || []);
        setProjects(projRes.data.data || []);
        setCapacity(capRes.data.data || []);
        setTasks(taskRes.data.data || []);
        setRequests(reqRes.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data.");
        setLoading(false);
      });
  }, []);

  const now   = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  const fp = useMemo(() => projects.filter(p => {
    const mr = region === 'All' || p.region === region;
    const ms = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    return mr && ms;
  }), [projects, region, search]);

  const fm = useMemo(() => members.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.role?.toLowerCase().includes(search.toLowerCase())
  ), [members, search]);

  const active     = fp.filter(p => p.status === 'Active').length;
  const overloaded = capacity.filter(c => (parseInt(c.allocated_percent) || 0) > 90).length;
  const available  = capacity.filter(c => (parseInt(c.allocated_percent) || 0) < 50).length;
  const avgCap     = capacity.length ? Math.round(capacity.reduce((s,c) => s + (parseInt(c.allocated_percent) || 0), 0) / capacity.length) : 0;
  const pending    = requests.filter(r => r.status === 'Pending').length;

  const urgentProjects = fp.filter(p => {
    if (!p.deadline || p.status === 'Completed') return false;
    const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
    return days <= 7 && days >= 0;
  });

  const chartData = capacity.slice(0,8).map(m => ({
    name: m.name?.split(' ')[0] || '?',
    value: parseInt(m.allocated_percent) || 0
  }));

  const trendData = [
    { day: 'Mon', util: 65 }, { day: 'Tue', util: 72 }, { day: 'Wed', util: 68 },
    { day: 'Thu', util: 75 }, { day: 'Fri', util: 70 }, { day: 'Sat', util: 40 }, { day: 'Sun', util: 35 },
  ];

  const getColor = (v) => v > 90 ? 'var(--red)' : v > 70 ? 'var(--yellow)' : 'var(--green)';

  const QUICK_ACTIONS = [
  { label: 'Add Project', icon: '➕', action: () => onNavigate('projects')  },
  { label: 'New Request', icon: '📝', action: () => onNavigate('requests')  },
  { label: 'Team Load',   icon: '⚖️', action: () => onNavigate('team')      },
  { label: 'Reports',     icon: '📈', action: () => onNavigate('analytics') },
  ];

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '100px' }}>Loading dashboard...</div>;
  if (error) return <div className="page" style={{ textAlign: 'center', padding: '100px', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      {/* Alert Banner */}
      {urgentProjects.map(p => {
        const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
        return (
          <div key={p.id} className="alert-banner alert-danger">
            ⚠️ <strong>{p.name}</strong> deadline in <strong>{days} day{days !== 1 ? 's' : ''}</strong> — {p.client}
          </div>
        );
      })}

      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div className="greeting-section" style={{ marginBottom: 0 }}>
          <div className="date">{dateStr}</div>
          <h1>{greeting}, {user?.name?.split(' ')[0] || 'Manager'} 👋</h1>
          <p>Here's what's happening across your projects today.</p>
        </div>

        {/* Region filter */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {['All','India','UAE'].map(r => (
            <button key={r} className={`filter-tab ${region===r?'active':''}`} onClick={() => setRegion(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4" style={{ marginBottom: '16px' }}>
        {[
          { label: 'Total Staff',      value: fm.length,   sub: 'Across teams',      color: 'var(--purple-light)', accent: 'purple', icon: '👥' },
          { label: 'Active Projects',  value: active,      sub: `${fp.length} total`, color: 'var(--blue)',         accent: 'blue',   icon: '📁' },
          { label: 'Overloaded',       value: overloaded,  sub: 'Need attention',    color: overloaded>0?'var(--red)':'var(--green)', accent: 'red', icon: '⚠️' },
          { label: 'Avg Utilization',  value: avgCap+'%',  sub: 'Team average',      color: avgCap>80?'var(--yellow)':'var(--green)', accent: 'yellow', icon: '📊' },
        ].map((m,i) => (
          <div key={m.label} className={`metric-card ${m.accent} card-animate`} style={{ animationDelay: `${i*0.07}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <span style={{ fontSize: '20px' }}>{m.icon}</span>
            </div>
            <div className="count-up" style={{ fontSize: '28px', fontWeight: '800', color: m.color, fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions — Fieldex style */}
      {role === 'manager' && (
        <div className="quick-actions">
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} className="quick-action-btn" onClick={a.action}>
              <span className="quick-action-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid-3-2" style={{ marginBottom: '16px' }}>
        <div className="card card-animate" style={{ animationDelay: '0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div className="card-title" style={{ marginBottom: '2px' }}>Workload Distribution</div>
              <div className="card-sub">Current utilization across staff</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[['var(--green)','OK'],['var(--yellow)','High'],['var(--red)','Over']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-dim)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickFormatter={v => v+'%'} domain={[0, 120]} />
                <Tooltip content={<CT />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 4 }} />
                <Bar dataKey="value" name="Allocated" radius={[6,6,0,0]}>
                  {chartData.map((e,i) => <Cell key={i} fill={getColor(e.value)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>No data available</div>}
        </div>

        <div className="card card-animate" style={{ animationDelay: '0.35s' }}>
          <div className="card-title">Upcoming Deadlines</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fp.filter(p => p.deadline && p.status !== 'Completed')
              .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
              .slice(0,4)
              .map(p => {
                const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
                const urgent = days <= 7;
                return (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 11px', background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                    transition: 'var(--transition)'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>{p.client}</div>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: urgent ? 'var(--red)' : 'var(--text-dim)', flexShrink: 0, marginLeft: '8px' }}>
                      {days <= 0 ? 'Overdue' : `${days}d`}
                    </div>
                  </div>
                );
              })}
            {fp.filter(p => p.deadline && p.status !== 'Completed').length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No upcoming deadlines ✅</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">

        {/* Utilization trend */}
        <div className="card card-animate" style={{ animationDelay: '0.4s' }}>
          <div className="card-title">Utilization Trend</div>
          <div className="card-sub">This week's capacity usage</div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickFormatter={v => v+'%'} domain={[0, 100]} />
              <Tooltip content={<CT />} cursor={{ stroke: 'var(--border-light)' }} />
              <Area type="monotone" dataKey="util" name="Utilization" stroke="var(--purple)" fill="url(#trendGrad)" strokeWidth={2.5} dot={{ fill: 'var(--purple)', r: 3 }} unit="%" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="card card-animate" style={{ animationDelay: '0.45s' }}>
          <div className="card-title">Today's Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Pending Tasks',    value: tasks.filter(t=>t.status==='Pending').length,     color: 'var(--yellow)', icon: '⏳' },
              { label: 'In Progress',      value: tasks.filter(t=>t.status==='In Progress').length, color: 'var(--blue)',   icon: '🔄' },
              { label: 'Completed',        value: tasks.filter(t=>t.status==='Completed').length,   color: 'var(--green)',  icon: '✅' },
              { label: 'Pending Requests', value: pending,                                          color: 'var(--orange)', icon: '📬' },
              { label: 'Available Staff',  value: available,                                        color: 'var(--purple-light)', icon: '🟢' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{s.icon}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
