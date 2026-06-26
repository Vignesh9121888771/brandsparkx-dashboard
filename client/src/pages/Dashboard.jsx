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

  const filteredProjects = useMemo(() => {
    const list = region === 'All' ? projects : projects.filter(p => p.region === region);
    if (!search) return list;
    return list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase()));
  }, [projects, region, search]);

  const activeCount  = filteredProjects.filter(p => p.status === 'Active').length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  // Productivity metrics
  const avgProductivity = productivity.length
    ? Math.round(productivity.reduce((s,m) => s + (parseFloat(m.productivity_score)||0), 0) / productivity.length)
    : 0;
  const topPerformers = [...productivity].sort((a,b) => (b.productivity_score||0) - (a.productivity_score||0)).slice(0,3);
  const highPerformers = productivity.filter(m => (m.productivity_score||0) >= 80).length;
  const totalIncentivePoints = productivity.reduce((s,m) => s + (m.incentive_points||0), 0);

  // Productivity chart data
  const productivityChartData = productivity.slice(0,8).map(m => ({
    name: m.name?.split(' ')[0],
    value: Math.round(parseFloat(m.productivity_score) || 0),
    color: getProductivityColor(m.productivity_score)
  }));

  const urgentProjects = filteredProjects.filter(p => {
    if (!p.deadline || p.status === 'Completed') return false;
    const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
    return days <= 7 && days >= 0;
  });

  if (loading) return <div className="loading-state">Syncing operational data...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom:'24px' }}>
        <div>
          <div style={{ fontSize:'12px', color:'var(--text-dim)', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{dateStr}</div>
          <h1 style={{ fontSize:'28px', fontWeight:'800', letterSpacing:'-0.02em' }}>{greeting}, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p style={{ color:'var(--text-dim)', marginTop:'4px' }}>Here's what's happening across {region === 'All' ? 'all regions' : region} today.</p>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
           <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ padding:'8px 14px', borderRadius:'8px', background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:'13px', cursor:'pointer' }}
          >
            <option value="All">All Regions</option>
            <option value="India">India</option>
            <option value="UAE">UAE</option>
          </select>
          <button className="btn-primary" onClick={() => onNavigate('projects')}>+ New Project</button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid-4" style={{ marginBottom:'24px' }}>
        {[
          { label:'Avg Productivity',   value:`${avgProductivity}%`, sub:'Based on output quality', color:getProductivityColor(avgProductivity), icon:'📊' },
          { label:'High Performers',    value:highPerformers,        sub:'Score above 80%',       color:'var(--green)',        icon:'🏆' },
          { label:'Active Projects',    value:activeCount,           sub:`${filteredProjects.length} total projects`, color:'var(--purple-light)', icon:'📁' },
          { label:'Incentive Pool',     value:totalIncentivePoints,  sub:'Total points earned',   color:'var(--yellow)',       icon:'🎯' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:'20px', display:'flex', alignItems:'center', gap:'16px' }}>
             <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>{s.icon}</div>
             <div>
                <div style={{ fontSize:'11px', color:'var(--text-dim)', textTransform:'uppercase', fontWeight:'600' }}>{s.label}</div>
                <div style={{ fontSize:'24px', fontWeight:'800', color:s.color, fontFamily:'var(--font-mono)' }}>{s.value}</div>
                <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{s.sub}</div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid-2-1" style={{ gap:'24px', marginBottom:'24px' }}>
        {/* Productivity Chart */}
        <div className="card" style={{ padding:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
            <div>
              <h3 style={{ fontSize:'16px', fontWeight:'700' }}>Productivity Distribution</h3>
              <p style={{ fontSize:'12px', color:'var(--text-dim)' }}>Performance scores per team member</p>
            </div>
            <button onClick={() => onNavigate('manager')} style={{ fontSize:'11px', color:'var(--purple-light)', background:'transparent', border:'none', cursor:'pointer', fontWeight:'600' }}>View Details →</button>
          </div>

          <div style={{ height:'240px' }}>
            {productivityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productivityChartData} barSize={20}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} tickFormatter={v => v+'%'} />
                  <Tooltip content={<CT />} cursor={{ fill:'var(--bg-hover)', opacity:0.4 }} />
                  <Bar dataKey="value" name="Productivity" radius={[4,4,0,0]}>
                    {productivityChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-dim)', fontSize:'12px' }}>No performance data available.</div>
            )}
          </div>
        </div>

        {/* Top Performers Leaderboard */}
        <div className="card" style={{ padding:'24px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:'700', marginBottom:'16px' }}>🏆 Productivity Leaderboard</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {topPerformers.length > 0 ? topPerformers.map((p,i) => {
              const score = parseFloat(p.productivity_score)||0;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'10px', background:'var(--bg-hover)', border:'1px solid var(--border)' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'var(--purple-dim)', color:'var(--purple-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700' }}>{p.name?.[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:'600' }}>{p.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                       <div style={{ flex:1, height:'4px', background:'var(--border)', borderRadius:'2px' }}>
                          <div style={{ height:'100%', width:`${score}%`, background:getProductivityColor(score), borderRadius:'2px' }} />
                       </div>
                       <span style={{ fontSize:'11px', fontWeight:'800', color:getProductivityColor(score), fontFamily:'var(--font-mono)' }}>{score.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize:'18px' }}>{i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : '✨'}</div>
                </div>
              );
            }) : (
              <div style={{ color:'var(--text-dim)', fontSize:'12px' }}>No performance data yet.</div>
            )}
          </div>
          <button className="btn-secondary" style={{ width:'100%', marginTop:'16px', fontSize:'12px' }} onClick={() => onNavigate('team')}>View Full Team</button>
        </div>
      </div>

      {/* Critical Items Section */}
      {urgentProjects.length > 0 && (
        <div className="card" style={{ padding:'24px', borderLeft:'4px solid var(--red)', marginBottom:'24px' }}>
           <h3 style={{ fontSize:'16px', fontWeight:'700', color:'var(--red)', marginBottom:'12px' }}>⚠️ Critical Deadlines</h3>
           <div className="grid-3" style={{ gap:'16px' }}>
              {urgentProjects.map(p => (
                <div key={p.id} style={{ padding:'12px', background:'var(--bg-hover)', borderRadius:'8px', border:'1px solid var(--border)' }}>
                   <div style={{ fontSize:'13px', fontWeight:'600' }}>{p.name}</div>
                   <div style={{ fontSize:'11px', color:'var(--red)', marginTop:'4px' }}>Due: {new Date(p.deadline).toLocaleDateString()}</div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid-2-1" style={{ gap:'24px' }}>
        <div className="card" style={{ padding:'24px' }}>
           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ fontSize:'16px', fontWeight:'700' }}>Pending Operational Requests</h3>
              <span className="badge badge-yellow">{pendingCount} Waiting</span>
           </div>
           <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {requests.filter(r => r.status === 'Pending').slice(0,4).map(r => (
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px' }}>
                   <div>
                      <div style={{ fontSize:'13px', fontWeight:'600' }}>{r.member_name} <span style={{ fontWeight:'400', color:'var(--text-dim)' }}>requested</span> {r.type}</div>
                      <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'2px' }}>{r.title}</div>
                   </div>
                   <button onClick={() => onNavigate('requests')} className="btn-secondary" style={{ padding:'4px 10px', fontSize:'11px' }}>Review</button>
                </div>
              ))}
              {pendingCount === 0 && <div style={{ color:'var(--text-dim)', fontSize:'12px', padding:'10px' }}>No pending requests.</div>}
           </div>
        </div>

        <div className="card" style={{ padding:'24px' }}>
           <h3 style={{ fontSize:'16px', fontWeight:'700', marginBottom:'16px' }}>Quick Actions</h3>
           <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                { label:'Manager Control', action:()=>onNavigate('manager'), icon:'🛡️' },
                { label:'Team Analytics', action:()=>onNavigate('analytics'), icon:'📈' },
                { label:'Calendar', action:()=>onNavigate('calendar'), icon:'📅' },
              ].map((a,i) => (
                <button key={i} onClick={a.action} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'10px', background:'var(--bg-hover)', border:'1px solid var(--border)', cursor:'pointer', width:'100%', textAlign:'left' }}>
                  <span style={{ fontSize:'18px' }}>{a.icon}</span>
                  <span style={{ fontSize:'13px', fontWeight:'600' }}>{a.label}</span>
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
