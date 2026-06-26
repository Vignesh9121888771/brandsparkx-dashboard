import { useEffect, useState } from 'react';
import { getCapacity, getTasks, getProductivitySummary } from '../services/api';

const getProductivityStatus = (score) => {
  const s = parseFloat(score) || 0;
  if (s >= 80) return { label:'High',    color:'var(--green)',  bg:'var(--green-dim)'  };
  if (s >= 50) return { label:'Medium',  color:'var(--yellow)', bg:'var(--yellow-dim)' };
  if (s >  0)  return { label:'Low',     color:'var(--red)',    bg:'var(--red-dim)'    };
  return              { label:'No Data', color:'var(--text-dim)', bg:'var(--bg-hover)' };
};

export default function TeamCapacity({ search, defaultRegion }) {
  const [members,      setMembers]      = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [filter,       setFilter]       = useState('All');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Get productivity summary + capacity + tasks
        const [prodRes, capRes, taskRes] = await Promise.all([
          getProductivitySummary(),
          getCapacity(),
          getTasks(),
        ]);

        const prodData = prodRes.data.data || [];
        const capData  = capRes.data.data  || [];
        const taskData = taskRes.data.data || [];
        setTasks(taskData);

        // Merge productivity data with capacity data
        const merged = capData.map(m => {
          const prod = prodData.find(p => p.id === m.id) || {};
          return { ...m, ...prod };
        });

        setMembers(merged);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load team data:', err);
        setError('Failed to load team capacity data');
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = members.filter(m => {
    const matchesSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.role?.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = defaultRegion === 'All' || !defaultRegion || m.region === defaultRegion;

    if (filter === 'All') return matchesSearch && matchesRegion;
    if (filter === 'High Load') return matchesSearch && matchesRegion && (parseInt(m.allocated_percent) || 0) > 80;
    if (filter === 'Available') return matchesSearch && matchesRegion && (parseInt(m.available_percent) || 0) > 20;
    if (filter === 'High Performers') return matchesSearch && matchesRegion && (parseFloat(m.productivity_score) || 0) >= 80;
    return matchesSearch && matchesRegion;
  });

  const avgProductivity = members.length
    ? Math.round(members.reduce((acc, m) => acc + (parseFloat(m.productivity_score) || 0), 0) / members.length)
    : 0;
  const highPerformers = members.filter(m => (parseFloat(m.productivity_score) || 0) >= 80).length;
  const topPerformer   = [...members].sort((a,b) => (parseFloat(b.productivity_score)||0) - (parseFloat(a.productivity_score)||0))[0];
  const totalIncentive = members.reduce((acc, m) => acc + (parseInt(m.incentive_points) || 0), 0);

  const filters = ['All', 'High Load', 'Available', 'High Performers'];

  if (loading) return <div className="loading-state">Analyzing team performance...</div>;
  if (error)   return <div className="error-state">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Team Capacity & Productivity</h1>
        <p>Real-time resource allocation and performance tracking.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        {[
          { label:'Avg Productivity', value:avgProductivity+'%', sub:'Team efficiency', color:'var(--purple)',      icon:'📊' },
          { label:'High Performers',  value:highPerformers,        sub:'Score ≥ 80%',  color:'var(--green)',        icon:'🏆' },
          { label:'Top Performer',    value:topPerformer?.name?.split(' ')[0]||'—', sub:`${topPerformer?.productivity_score||0}% score`, color:'var(--purple-light)', icon:'⭐' },
          { label:'Total Points',     value:totalIncentive,        sub:'Incentive pool', color:'var(--yellow)',       icon:'🎯' },
        ].map((m,i) => (
          <div key={i} className="metric-card" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <div style={{ fontSize:'11px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</div>
              <span style={{ fontSize:'18px' }}>{m.icon}</span>
            </div>
            <div style={{ fontSize:'26px', fontWeight:'800', color:m.color, fontFamily:'var(--font-mono)', marginBottom:'4px' }}>{m.value}</div>
            <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Productivity formula explanation */}
      <div style={{ padding:'12px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', marginBottom:'20px', display:'flex', gap:'16px', flexWrap:'wrap' }}>
        <div style={{ fontSize:'11px', color:'var(--text-dim)', fontWeight:'600', marginRight:'4px' }}>Productivity Formula:</div>
        {[
          { label:'Task Completion', weight:'40%', color:'var(--blue)' },
          { label:'Approved Progress', weight:'30%', color:'var(--purple-light)' },
          { label:'On-Time Delivery', weight:'20%', color:'var(--green)' },
          { label:'Quality Rating', weight:'10%', color:'var(--yellow)' },
        ].map(f => (
          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:f.color, flexShrink:0 }} />
            <span style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{f.label}</span>
            <span style={{ fontSize:'11px', fontWeight:'700', color:f.color }}>{f.weight}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'6px 14px', borderRadius:'20px', border:'1px solid', fontSize:'12px', fontWeight:'500', cursor:'pointer',
            borderColor: filter===f ? 'var(--purple)' : 'var(--border)',
            background:  filter===f ? 'var(--purple-dim)' : 'transparent',
            color:       filter===f ? 'var(--purple-light)' : 'var(--text-dim)',
          }}>{f}</button>
        ))}
      </div>

      {/* Member cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {filtered.map(m => {
          const score    = parseFloat(m.productivity_score) || 0;
          const status   = getProductivityStatus(score);
          const initials = m.name?.split(' ').map(n=>n[0]).join('') || '?';
          const memberTasks = tasks.filter(t => t.assigned_to === m.id);
          const completedTasks = memberTasks.filter(t => t.status === 'Completed').length;
          const inProgressTasks = memberTasks.filter(t => t.status === 'In Progress').length;

          return (
            <div key={m.id} className="card" style={{ padding:'20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr', gap:'16px', alignItems:'center' }}>

                {/* Member info */}
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{
                      width:'40px', height:'40px', borderRadius:'50%',
                      background:`linear-gradient(135deg, ${status.color}33, ${status.color}11)`,
                      border:`2px solid ${status.color}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'13px', fontWeight:'700', color:status.color
                    }}>{initials}</div>
                    {m.overtime_submissions > 0 && (
                      <div style={{ position:'absolute', top:'-4px', right:'-4px', width:'14px', height:'14px', borderRadius:'50%', background:'var(--yellow)', border:'2px solid var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px' }}>⏰</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'600' }}>{m.name||'Unknown'}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>{m.role||'N/A'}</div>
                    <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'20px', background:m.region==='UAE'?'var(--blue-dim)':'var(--green-dim)', color:m.region==='UAE'?'var(--blue)':'var(--green)', marginTop:'3px', display:'inline-block' }}>{m.region}</span>
                  </div>
                </div>

                {/* Productivity Score */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'22px', fontWeight:'800', color:status.color, fontFamily:'var(--font-mono)' }}>{score.toFixed(0)}%</div>
                  <div style={{ marginTop:'4px' }}>
                    <div style={{ height:'4px', background:'var(--border)', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${score}%`, background:status.color, borderRadius:'2px', transition:'width 0.8s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'3px' }}>Productivity</div>
                </div>

                {/* Tasks */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'var(--text-primary)' }}>
                    {completedTasks}<span style={{ fontSize:'12px', color:'var(--text-dim)' }}>/{memberTasks.length}</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>Tasks Done</div>
                  {inProgressTasks > 0 && (
                    <div style={{ fontSize:'10px', color:'var(--blue)', marginTop:'1px' }}>{inProgressTasks} in progress</div>
                  )}
                </div>

                {/* Quality */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'var(--yellow)' }}>
                    {m.avg_quality ? `${parseFloat(m.avg_quality).toFixed(1)}★` : '—'}
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>Avg Quality</div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>out of 5</div>
                </div>

                {/* Incentive Points */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'var(--yellow)' }}>🏆 {m.incentive_points||0}</div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>Incentive Pts</div>
                  {m.overtime_submissions > 0 && (
                    <div style={{ fontSize:'10px', color:'var(--yellow)', marginTop:'1px' }}>⏰ {m.overtime_submissions} overtime</div>
                  )}
                </div>

                {/* Status badge */}
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:'11px', padding:'5px 12px', borderRadius:'20px', background:status.bg, color:status.color, fontWeight:'600' }}>{status.label}</span>
                  {m.on_time_tasks > 0 && (
                    <div style={{ fontSize:'10px', color:'var(--green)', marginTop:'4px' }}>✅ {m.on_time_tasks} on time</div>
                  )}
                </div>
              </div>

              {/* Mini task breakdown bar */}
              {memberTasks.length > 0 && (
                <div style={{ marginTop:'14px', paddingTop:'14px', borderTop:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', gap:'4px', height:'6px', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ flex:completedTasks, background:'var(--green)', minWidth:completedTasks>0?'4px':0 }} />
                    <div style={{ flex:inProgressTasks, background:'var(--blue)', minWidth:inProgressTasks>0?'4px':0 }} />
                    <div style={{ flex:memberTasks.length-completedTasks-inProgressTasks, background:'var(--border)' }} />
                  </div>
                  <div style={{ display:'flex', gap:'12px', marginTop:'5px' }}>
                    <span style={{ fontSize:'10px', color:'var(--green)' }}>■ {completedTasks} completed</span>
                    <span style={{ fontSize:'10px', color:'var(--blue)' }}>■ {inProgressTasks} in progress</span>
                    <span style={{ fontSize:'10px', color:'var(--text-dim)' }}>■ {memberTasks.length-completedTasks-inProgressTasks} pending</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding:'40px', textAlign:'center', color:'var(--text-dim)', fontSize:'13px', background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
          No employees match this filter
        </div>
      )}
    </div>
  );
}
