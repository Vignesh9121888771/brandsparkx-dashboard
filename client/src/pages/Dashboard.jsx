import { useEffect, useState, useMemo } from 'react';
import { getMembers, getProjects, getCapacity, getTasks, getRequests } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://brandsparkx-dashboard.onrender.com/api';

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:'8px', padding:'8px 12px', fontSize:'12px', boxShadow:'var(--shadow-md)' }}>
      <div style={{ fontWeight:'600', marginBottom:'3px', color:'var(--text-primary)' }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.fill||p.color }}>{p.name}: {p.value}{p.unit||'%'}</div>)}
    </div>
  );
};

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getProductivityColor = (score) => {
  const s = parseFloat(score) || 0;
  if (s >= 80) return 'var(--green)';
  if (s >= 50) return 'var(--yellow)';
  if (s > 0)   return 'var(--red)';
  return 'var(--text-dim)';
};

export default function Dashboard({ role, user, search, defaultRegion, onNavigate }) {
  const [members,      setMembers]      = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [capacity,     setCapacity]     = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [productivity, setProductivity] = useState([]);
  const [region,       setRegion]       = useState(defaultRegion || 'All');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('bsx_token');
        const [memRes, projRes, capRes, taskRes, reqRes] = await Promise.all([
          getMembers(), getProjects(), getCapacity(), getTasks(), getRequests()
        ]);
        setMembers(memRes.data.data   || []);
        setProjects(projRes.data.data || []);
        setCapacity(capRes.data.data  || []);
        setTasks(taskRes.data.data    || []);
        setRequests(reqRes.data.data  || []);

        // Load productivity summary
        try {
          const prodRes = await axios.get(`${API_URL}/tasks/productivity/summary`, {
            headers: { Authorization:`Bearer ${token}` }
          });
          setProductivity(prodRes.data.data || []);
        } catch { setProductivity([]); }

        setLoading(false);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data.');
        setLoading(false);
      }
    };
    load();
  }, []);

  const now      = new Date();
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

  const active  = fp.filter(p => p.status === 'Active').length;
  const pending = requests.filter(r => r.status === 'Pending').length;

  // Productivity metrics
  const avgProductivity = productivity.length
    ? Math.round(productivity.reduce((s,m) => s + (parseFloat(m.productivity_score)||0), 0) / productivity.length)
    : 0;
  const topPerformers = [...productivity].sort((a,b) => (b.productivity_score||0) - (a.productivity_score||0)).slice(0,3);
  const highPerformers = productivity.filter(m => (m.productivity_score||0) >= 80).length;
  const totalIncentivePoints = productivity.reduce((s,m) => s + (m.incentive_points||0), 0);

  const urgentProjects = fp.filter(p => {
    if (!p.deadline || p.status === 'Completed') return false;
    const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
    return days <= 7 && days >= 0;
  });

  // Productivity chart data
  const productivityChartData = productivity.slice(0,8).map(m => ({
    name:  m.name?.split(' ')[0] || '?',
    value: Math.round(parseFloat(m.productivity_score) || 0),
    color: getProductivityColor(m.productivity_score)
  }));

  const trendData = [
    { day:'Mon', util:65 }, { day:'Tue', util:72 }, { day:'Wed', util:68 },
    { day:'Thu', util:75 }, { day:'Fri', util:70 }, { day:'Sat', util:40 }, { day:'Sun', util:35 },
  ];

  const QUICK_ACTIONS = [
    { label:'Add Project', icon:'➕', action:() => onNavigate('projects')  },
    { label:'New Request', icon:'📝', action:() => onNavigate('requests')  },
    { label:'Team Load',   icon:'⚖️', action:() => onNavigate('team')      },
    { label:'Reports',     icon:'📈', action:() => onNavigate('analytics') },
  ];

  if (loading) return <div className="page" style={{ textAlign:'center', padding:'100px' }}>Loading dashboard...</div>;
  if (error)   return <div className="page" style={{ textAlign:'center', padding:'100px', color:'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      {/* Alert Banners */}
      {urgentProjects.map(p => {
        const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
        return (
          <div key={p.id} className="alert-banner alert-danger">
            ⚠️ <strong>{p.name}</strong> deadline in <strong>{days} day{days!==1?'s':''}</strong> — {p.client}
          </div>
        );
      })}

      {/* Greeting */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
        <div className="greeting-section" style={{ marginBottom:0 }}>
          <div className="date">{dateStr}</div>
          <h1>{greeting}, {user?.name?.split(' ')[0] || 'Manager'} 👋</h1>
          <p>Here's what's happening across your projects today.</p>
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          {['All','India','UAE'].map(r => (
            <button key={r} className={`filter-tab ${region===r?'active':''}`} onClick={() => setRegion(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom:'16px' }}>
        {[
          { label:'Total Staff',        value:fm.length,          sub:'Across teams',          color:'var(--purple-light)', accent:'purple', icon:'👥' },
          { label:'Active Projects',    value:active,             sub:`${fp.length} total`,    color:'var(--blue)',         accent:'blue',   icon:'📁' },
          { label:'Avg Productivity',   value:`${avgProductivity}%`, sub:'Based on output quality', color:getProductivityColor(avgProductivity), accent:'green', icon:'📊' },
          { label:'High Performers',    value:highPerformers,     sub:'Score ≥ 80%',           color:'var(--green)',        accent:'yellow', icon:'🏆' },
        ].map((m,i) => (
          <div key={m.label} className={`metric-card ${m.accent} card-animate`} style={{ animationDelay:`${i*0.07}s` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</div>
              <span style={{ fontSize:'20px' }}>{m.icon}</span>
            </div>
            <div className="count-up" style={{ fontSize:'28px', fontWeight:'800', color:m.color, fontFamily:'var(--font-mono)', marginBottom:'4px' }}>{m.value}</div>
            <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
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

      {/* Charts Row */}
      <div className="grid-3-2" style={{ marginBottom:'16px' }}>

        {/* Productivity Chart */}
        <div className="card card-animate" style={{ animationDelay:'0.3s' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <div>
              <div className="card-title" style={{ marginBottom:'2px' }}>Productivity Distribution</div>
              <div className="card-sub">Score based on output quality, not hours</div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              {[['var(--green)','High'],['var(--yellow)','Med'],['var(--red)','Low']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'var(--text-dim)' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:c }} />{l}
                </div>
              ))}
            </div>
          </div>
          {productivityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={productivityChartData} barSize={28} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:10 }} tickFormatter={v => v+'%'} domain={[0,100]} />
                <Tooltip content={<CT />} cursor={{ fill:'rgba(255,255,255,0.02)', radius:4 }} />
                <Bar dataKey="value" name="Productivity" radius={[6,6,0,0]}>
                  {productivityChartData.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:'180px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dim)', flexDirection:'column', gap:'8px' }}>
              <div style={{ fontSize:'24px' }}>📊</div>
              <div style={{ fontSize:'12px' }}>No productivity data yet</div>
              <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>Data appears after manager approves progress updates</div>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card card-animate" style={{ animationDelay:'0.35s' }}>
          <div className="card-title">Upcoming Deadlines</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {fp.filter(p => p.deadline && p.status!=='Completed')
              .sort((a,b) => new Date(a.deadline)-new Date(b.deadline))
              .slice(0,4)
              .map(p => {
                const days   = Math.ceil((new Date(p.deadline)-new Date())/(1000*60*60*24));
                const urgent = days <= 7;
                return (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 11px', background:'var(--bg-hover)', borderRadius:'var(--radius-md)', border:`1px solid ${urgent?'rgba(239,68,68,0.3)':'var(--border)'}`, transition:'var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background='var(--bg-hover)'}
                  >
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'1px' }}>{p.client}</div>
                    </div>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:urgent?'var(--red)':'var(--text-dim)', flexShrink:0, marginLeft:'8px' }}>
                      {days<=0?'Overdue':`${days}d`}
                    </div>
                  </div>
                );
              })}
            {fp.filter(p => p.deadline && p.status!=='Completed').length===0 && (
              <div style={{ color:'var(--text-dim)', fontSize:'12px', textAlign:'center', padding:'20px' }}>No upcoming deadlines ✅</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">

        {/* Top Performers Leaderboard */}
        <div className="card card-animate" style={{ animationDelay:'0.4s' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <div>
              <div className="card-title" style={{ marginBottom:'2px' }}>🏆 Productivity Leaderboard</div>
              <div className="card-sub">Top performers by output quality</div>
            </div>
            <div style={{ fontSize:'11px', color:'var(--yellow)' }}>🎯 {totalIncentivePoints} pts total</div>
          </div>
          {topPerformers.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px', color:'var(--text-dim)', fontSize:'12px' }}>
              No productivity data yet — approve progress updates to see scores
            </div>
          ) : topPerformers.map((m,i) => {
            const score = parseFloat(m.productivity_score)||0;
            const medals = ['🥇','🥈','🥉'];
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'var(--bg-hover)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', marginBottom:'8px' }}>
                <span style={{ fontSize:'20px', flexShrink:0 }}>{medals[i]||'🏅'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'12px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{m.role} · {m.completed_tasks||0}/{m.total_tasks||0} tasks</div>
                  <div style={{ marginTop:'4px', height:'3px', background:'var(--border)', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${score}%`, background:getProductivityColor(score), borderRadius:'2px' }} />
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'16px', fontWeight:'800', color:getProductivityColor(score), fontFamily:'var(--font-mono)' }}>{score.toFixed(0)}%</div>
                  <div style={{ fontSize:'10px', color:'var(--yellow)' }}>🏆 {m.incentive_points||0} pts</div>
                </div>
              </div>
            );
          })}
          {topPerformers.length > 0 && (
            <button onClick={() => onNavigate('team')} style={{ width:'100%', background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'8px', fontSize:'11px', color:'var(--purple-light)', cursor:'pointer', marginTop:'4px' }}>
              View Full Team →
            </button>
          )}
        </div>

        {/* Today's Summary */}
        <div className="card card-animate" style={{ animationDelay:'0.45s' }}>
          <div className="card-title">Today's Summary</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              { label:'Pending Tasks',    value:tasks.filter(t=>t.status==='Pending').length,     color:'var(--yellow)',       icon:'⏳' },
              { label:'In Progress',      value:tasks.filter(t=>t.status==='In Progress').length, color:'var(--blue)',         icon:'🔄' },
              { label:'Completed',        value:tasks.filter(t=>t.status==='Completed').length,   color:'var(--green)',        icon:'✅' },
              { label:'Pending Requests', value:pending,                                          color:'var(--orange)',       icon:'📬' },
              { label:'Incentive Pool',   value:`🏆 ${totalIncentivePoints}`,                    color:'var(--yellow)',       icon:'🎯' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'var(--bg-hover)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'14px' }}>{s.icon}</span>
                  <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{s.label}</span>
                </div>
                <span style={{ fontSize:'16px', fontWeight:'700', color:s.color, fontFamily:'var(--font-mono)' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}