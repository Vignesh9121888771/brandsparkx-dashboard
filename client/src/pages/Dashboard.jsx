import { useEffect, useState, useMemo } from 'react';
import { getProjects, getRequests, getProductivitySummary } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

export default function Dashboard({ user, search, defaultRegion, onNavigate }) {
  const [projects,     setProjects]     = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [productivity, setProductivity] = useState([]);
  const [region,       setRegion]       = useState(defaultRegion || 'All');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, reqRes, prodRes] = await Promise.all([
          getProjects(), getRequests(), getProductivitySummary()
        ]);
        setProjects(projRes.data.data || []);
        setRequests(reqRes.data.data  || []);
        setProductivity(prodRes.data.data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const now      = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  const filteredProjects = useMemo(() => {
    const list = region === 'All' ? projects : projects.filter(p => p.region === region);
    if (!search) return list;
    return list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase()));
  }, [projects, region, search]);

  const activeCount  = filteredProjects.filter(p => p.status === 'Active').length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const avgProductivity = productivity.length
    ? Math.round(productivity.reduce((s,m) => s + (parseFloat(m.productivity_score)||0), 0) / productivity.length)
    : 0;
  const topPerformers = [...productivity].sort((a,b) => (b.productivity_score||0) - (a.productivity_score||0)).slice(0,3);
  const totalIncentivePoints = productivity.reduce((s,m) => s + (parseInt(m.incentive_points)||0), 0);

  const productivityChartData = productivity.slice(0,8).map(m => ({
    name: m.name?.split(' ')[0],
    value: Math.round(parseFloat(m.productivity_score) || 0),
    color: getProductivityColor(m.productivity_score)
  }));

  const upcomingDeadlines = filteredProjects.filter(p => {
    if (!p.deadline || p.status === 'Completed') return false;
    const days = Math.ceil((new Date(p.deadline) - new Date())/(1000*60*60*24));
    return days > 0; // Filter out overdue from display as per user request
  }).sort((a,b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4);

  if (loading) return <div className="loading-state">Syncing dashboard...</div>;
  if (error) return <div className="error-state">{error}</div>;

  const role = user?.role || 'employee';

  return (
    <div className="page card-animate">
      <div className="greeting-section">
        <div className="date">{dateStr}</div>
        <h1>{greeting}, {user?.name?.split(' ')[0] || 'User'}!</h1>
        <p>Operational status for {region === 'All' ? 'all regions' : region}.</p>
      </div>

      <div style={{ display:'flex', gap:'10px', marginBottom:'24px' }}>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="inp" style={{ width:'160px' }}
        >
          <option value="All">All Regions</option>
          <option value="India">India</option>
          <option value="UAE">UAE</option>
        </select>
        {role === 'manager' && (
          <button className="btn btn-primary" onClick={() => onNavigate('projects')}>+ New Project</button>
        )}
      </div>

      <div className="grid-4" style={{ marginBottom:'24px' }}>
        {[
          { label:'Avg Productivity',   value:`${avgProductivity}%`, sub:'Quality driven score', color:getProductivityColor(avgProductivity), icon:'📊' },
          { label:'Active Projects',    value:activeCount,           sub:'Delivering results',  color:'var(--purple-light)', icon:'📁' },
          { label:'Pending Requests',   value:pendingCount,          sub:'Awaiting review',      color:'var(--orange)',       icon:'📬' },
          { label:'Incentive Pool',     value:totalIncentivePoints,  sub:'Total points earned',   color:'var(--yellow)',       icon:'🎯' },
        ].map((m,i) => (
          <div key={i} className="card card-animate" style={{ animationDelay: `${i*0.05}s` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:'var(--text-dim)', textTransform:'uppercase' }}>{m.label}</div>
              <span>{m.icon}</span>
            </div>
            <div style={{ fontSize:'28px', fontWeight:'800', color:m.color, fontFamily:'var(--font-mono)' }}>{m.value}</div>
            <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'4px' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-3-2" style={{ marginBottom:'24px' }}>
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
             <h3>Productivity Distribution</h3>
             <div style={{ display:'flex', gap:'10px' }}>
                {[['var(--green)','High'],['var(--yellow)','Med'],['var(--red)','Low']].map(([c,l]) => (
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'var(--text-dim)' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:c }} />{l}
                  </div>
                ))}
             </div>
          </div>
          <div style={{ height:'200px' }}>
            {productivityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productivityChartData} barSize={24}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} tickFormatter={v => v+'%'} domain={[0,100]} />
                  <Tooltip content={<CT />} cursor={{ fill:'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="value" name="Productivity" radius={[4,4,0,0]}>
                    {productivityChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state">No productivity data available.</div>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom:'16px' }}>Upcoming Deadlines</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {upcomingDeadlines.map(p => {
              const days = Math.ceil((new Date(p.deadline) - new Date())/(1000*60*60*24));
              return (
                <div key={p.id} className="table-row" style={{ padding:'10px', background:'var(--bg-hover)', borderRadius:'8px', gridTemplateColumns:'1fr auto' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'600' }}>{p.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{p.client}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:days<=7?'var(--red)':'var(--text-dim)' }}>{days}d left</div>
                    <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{new Date(p.deadline).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
            {upcomingDeadlines.length === 0 && <div className="empty-state">No upcoming deadlines.</div>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
             <h3>🏆 Productivity Leaderboard</h3>
             <span style={{ fontSize:'11px', color:'var(--text-dim)' }}>Top performers</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {topPerformers.map((m,i) => {
              const score = parseFloat(m.productivity_score)||0;
              const medals = ['🥇','🥈','🥉'];
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'var(--bg-hover)', borderRadius:'12px', border:'1px solid var(--border)' }}>
                   <span style={{ fontSize:'20px' }}>{medals[i] || '🏅'}</span>
                   <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'700' }}>{m.name}</div>
                      <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{m.role} · {m.completed_tasks||0} tasks completed</div>
                   </div>
                   <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'18px', fontWeight:'800', color:getProductivityColor(score), fontFamily:'var(--font-mono)' }}>{score.toFixed(0)}%</div>
                      <div style={{ fontSize:'10px', color:'var(--yellow)' }}>🏆 {m.incentive_points||0} pts</div>
                   </div>
                </div>
              );
            })}
            {topPerformers.length === 0 && <div className="empty-state">Leaderboard initializing...</div>}
          </div>
          <button className="btn btn-ghost" style={{ width:'100%', marginTop:'16px' }} onClick={() => onNavigate('team')}>View Full Team</button>
        </div>

        <div className="card">
           <h3 style={{ marginBottom:'20px' }}>Quick Actions</h3>
           <div className="quick-actions">
              <button className="quick-action-btn" onClick={() => onNavigate('requests')}>
                 <span className="quick-action-icon">📬</span>
                 <span>Requests</span>
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('analytics')}>
                 <span className="quick-action-icon">📈</span>
                 <span>Analytics</span>
              </button>
              <button className="quick-action-btn" onClick={() => onNavigate('calendar')}>
                 <span className="quick-action-icon">📅</span>
                 <span>Calendar</span>
              </button>
              {role === 'manager' && (
                <button className="quick-action-btn" onClick={() => onNavigate('manager')}>
                   <span className="quick-action-icon">🛡️</span>
                   <span>Admin</span>
                </button>
              )}
           </div>

           <h3 style={{ margin:'24px 0 16px' }}>System Info</h3>
           <div className="alert-banner alert-success" style={{ background:'var(--purple-dim)', borderColor:'var(--purple)' }}>
              <span style={{ fontSize:'16px' }}>⭐</span>
              <div>
                 <div style={{ fontWeight:'600', color:'var(--purple-light)' }}>Productivity Formula Active</div>
                 <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>Quality & Completion focused incentives</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
