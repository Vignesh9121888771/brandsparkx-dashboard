import { useEffect, useState, useMemo } from 'react';
import { getMembers, getProjects, getCapacity, getTasks, getRequests, getProductivitySummary } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
        const [memRes, projRes, capRes, taskRes, reqRes, prodRes] = await Promise.all([
          getMembers(), getProjects(), getCapacity(), getTasks(), getRequests(), getProductivitySummary()
        ]);
        setMembers(memRes.data.data   || []);
        setProjects(projRes.data.data || []);
        setCapacity(capRes.data.data  || []);
        setTasks(taskRes.data.data    || []);
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

  const filteredMembers = useMemo(() => {
    const list = region === 'All' ? members : members.filter(m => m.region === region);
    if (!search) return list;
    return list.filter(m =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.role?.toLowerCase().includes(search.toLowerCase())
    );
  }, [members, region, search]);

  const filteredProjects = useMemo(() => {
    const list = region === 'All' ? projects : projects.filter(p => p.region === region);
    if (!search) return list;
    return list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
  }, [projects, region, search]);

  const activeProjects = filteredProjects.filter(p => p.status === 'Active');
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) < new Date());

  const capacityData = filteredMembers.map(m => {
    const cap = capacity.find(c => c.id === m.id) || { allocated_percent: 0 };
    return {
      name: m.name?.split(' ')[0],
      allocated: parseInt(cap.allocated_percent) || 0,
      available: 100 - (parseInt(cap.allocated_percent) || 0)
    };
  }).slice(0, 8);

  const now = new Date();
  const dateStr = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  if (loading) return <div className="loading-state">Syncing operational data...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom:'24px' }}>
        <div>
          <div style={{ fontSize:'12px', color:'var(--text-dim)', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{dateStr}</div>
          <h1 style={{ fontSize:'28px', fontWeight:'800', letterSpacing:'-0.02em' }}>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
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
          { label:'Active Projects', value:activeProjects.length, sub:`${filteredProjects.length} total`, color:'var(--purple-light)', icon:'📁' },
          { label:'Pending Requests', value:pendingRequests.length, sub:'Awaiting review', color:'var(--yellow)', icon:'📩' },
          { label:'Team Capacity', value:Math.round(capacityData.reduce((a,b)=>a+b.allocated,0)/(capacityData.length||1)) + '%', sub:'Avg utilization', color:'var(--green)', icon:'📈' },
          { label:'Overdue Tasks', value:overdueTasks.length, sub:'Requires attention', color:'var(--red)', icon:'⚠️' },
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
        {/* Resource Allocation Chart */}
        <div className="card" style={{ padding:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
            <div>
              <h3 style={{ fontSize:'16px', fontWeight:'700' }}>Resource Allocation</h3>
              <p style={{ fontSize:'12px', color:'var(--text-dim)' }}>Current workload per team member</p>
            </div>
            <button onClick={() => onNavigate('manager')} style={{ fontSize:'11px', color:'var(--purple-light)', background:'transparent', border:'none', cursor:'pointer', fontWeight:'600' }}>View Details →</button>
          </div>

          <div style={{ height:'240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityData} barSize={16}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-dim)', fontSize:11 }} tickFormatter={v => v+'%'} />
                <Tooltip content={<CT />} cursor={{ fill:'var(--bg-hover)', opacity:0.4 }} />
                <Bar dataKey="allocated" name="Allocated" fill="var(--purple)" radius={[4,4,0,0]} />
                <Bar dataKey="available" name="Available" fill="var(--bg-hover)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Notifications */}
        <div className="card" style={{ padding:'24px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:'700', marginBottom:'16px' }}>Quick Actions</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              { label:'Assign New Task', action:()=>onNavigate('projects'), icon:'➕', desc:'Create and assign tasks' },
              { label:'Team Performance', action:()=>onNavigate('manager'), icon:'🏆', desc:'Review productivity' },
              { label:'Resource Reports', action:()=>onNavigate('analytics'), icon:'📊', desc:'Export utilization data' },
              { label:'Update Schedule', action:()=>onNavigate('calendar'), icon:'📅', desc:'Adjust project timelines' },
            ].map((a,i) => (
              <div key={i} onClick={a.action} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'10px', background:'var(--bg-hover)', border:'1px solid var(--border)', cursor:'pointer', transition:'transform 0.2s' }} className="hover-scale">
                <div style={{ fontSize:'18px' }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:'600' }}>{a.label}</div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Productivity Leaderboard */}
      <div className="card" style={{ padding:'24px' }}>
         <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
            <div>
              <h3 style={{ fontSize:'16px', fontWeight:'700' }}>High Performers</h3>
              <p style={{ fontSize:'12px', color:'var(--text-dim)' }}>Top productivity scores this month</p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
               <div style={{ fontSize:'11px', color:'var(--green)', background:'var(--green-dim)', padding:'4px 8px', borderRadius:'4px', fontWeight:'600' }}>On Track</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' }}>
             {productivity
               .filter(p => region === 'All' || p.region === region)
               .sort((a,b) => (b.productivity_score||0) - (a.productivity_score||0))
               .slice(0, 4)
               .map((p,i) => (
                 <div key={i} style={{ padding:'16px', borderRadius:'12px', border:'1px solid var(--border)', background:'var(--bg-card)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                       <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'var(--purple-dim)', color:'var(--purple-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700' }}>{p.name?.[0]}</div>
                       <div>
                          <div style={{ fontSize:'13px', fontWeight:'600' }}>{p.name}</div>
                          <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{p.role}</div>
                       </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                       <div>
                          <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'2px' }}>Score</div>
                          <div style={{ fontSize:'20px', fontWeight:'800', color:getProductivityColor(p.productivity_score), fontFamily:'var(--font-mono)' }}>{p.productivity_score}%</div>
                       </div>
                       <div style={{ fontSize:'18px' }}>{i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : '✨'}</div>
                    </div>
                 </div>
               ))
             }
             {productivity.length === 0 && <div style={{ color:'var(--text-dim)', fontSize:'13px', padding:'20px' }}>No performance data available.</div>}
          </div>
      </div>
    </div>
  );
}
