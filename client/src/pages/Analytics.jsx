import { useEffect, useState } from 'react';
import { getCapacity, getProjects, getTasks, getMembers } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Legend,
} from 'recharts';

const Card = ({ children, title, sub, style = {} }) => (
  <div className="card" style={style}>
    {title && (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600' }}>{title}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{sub}</div>}
      </div>
    )}
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-hover)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.unit || ''}</div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [capacity, setCapacity] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [capRes, projRes, taskRes, memRes] = await Promise.all([
          getCapacity(), getProjects(), getTasks(), getMembers()
        ]);
        setCapacity(capRes.data.data || []);
        setProjects(projRes.data.data || []);
        setTasks(taskRes.data.data || []);
        setMembers(memRes.data.data || []);
      } catch (err) {
        console.error('Analytics load error:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const utilizationData = capacity.map(c => ({
    name: c.name?.split(' ')[0],
    allocated: parseInt(c.allocated_percent) || 0,
    available: parseInt(c.available_percent) || 0,
  })).slice(0, 10);

  const statusCount = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const pieData      = Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  const PIE_COLORS   = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6'];

  const taskData = [
    { name: 'Pending',     value: tasks.filter(t => t.status === 'Pending').length,     fill: 'var(--yellow)' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'In Progress').length, fill: 'var(--blue)'   },
    { name: 'Completed',   value: tasks.filter(t => t.status === 'Completed').length,   fill: 'var(--green)'  },
    { name: 'Blocked',     value: tasks.filter(t => t.status === 'Blocked').length,     fill: 'var(--red)'    },
  ];

  const forecastData = [
    { week: 'W1', capacity: 72 }, { week: 'W2', capacity: 78 },
    { week: 'W3', capacity: 85 }, { week: 'W4', capacity: 80 },
    { week: 'W5', capacity: 88 }, { week: 'W6', capacity: 75 },
  ];

  const indiaCount = members.filter(m => m.region === 'India').length;
  const uaeCount   = members.filter(m => m.region === 'UAE').length;
  const avgUtil    = capacity.length
    ? Math.round(capacity.reduce((s, c) => s + (parseInt(c.allocated_percent) || 0), 0) / capacity.length)
    : 0;
  const overloaded = capacity.filter(c => (parseInt(c.allocated_percent) || 0) > 90).length;

  if (loading) return <div className="loading-state">Generating reports...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Analytics & Reports</h1>
        <p>Comprehensive overview of resource utilization and forecasting.</p>
      </div>

      {/* Top metrics */}
      <div className="grid-4" style={{ marginBottom: '16px' }}>
        {[
          { label: 'Global Utilization',   value: avgUtil + '%', color: avgUtil > 80 ? 'var(--yellow)' : 'var(--green)', sub: 'Team average' },
          { label: 'Critical Burnout Risk', value: overloaded,   color: overloaded > 0 ? 'var(--red)' : 'var(--green)', sub: '>90% allocation' },
          { label: 'Total Projects',        value: projects.length, color: 'var(--purple-light)', sub: `${projects.filter(p => p.status === 'Active').length} active` },
          { label: 'Tasks Completed',       value: tasks.filter(t => t.status === 'Completed').length, color: 'var(--green)', sub: `of ${tasks.length} total` },
        ].map(m => (
          <div key={m.label} className="card">
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>{m.label}</div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: m.color, fontFamily: 'var(--font-mono)' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid-2-1" style={{ marginBottom: '16px' }}>
        <Card title="Employee Utilization" sub="Allocated vs available capacity per employee">
          {utilizationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utilizationData} barSize={14} barGap={4}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickFormatter={v => v + '%'} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="allocated" name="Allocated" fill="var(--purple)" radius={[3,3,0,0]} unit="%" />
                <Bar dataKey="available" name="Available" fill="var(--green)"  radius={[3,3,0,0]} unit="%" opacity={0.6} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-dim)' }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>No data available</div>}
        </Card>

        <Card title="Project Status" sub="Distribution by status">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-hover)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '11px' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-dim)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>No projects</div>}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <Card title="Capacity Forecast" sub="6-week rolling projection">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickFormatter={v => v + '%'} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-light)' }} />
              <Area type="monotone" dataKey="capacity" name="Utilization" stroke="var(--purple)" fill="url(#capGrad)" strokeWidth={2} unit="%" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Work Progress" sub="Task status breakdown">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={taskData} layout="vertical" barSize={12}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} width={75} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" name="Tasks" radius={[0,4,4,0]}>
                {taskData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        <Card title="Team Distribution" sub="India vs UAE headcount">
          <div className="grid-2" style={{ gap: '10px' }}>
            {[
              { region: 'India', count: indiaCount, color: 'var(--green)', bg: 'var(--green-dim)' },
              { region: 'UAE',   count: uaeCount,   color: 'var(--blue)',  bg: 'var(--blue-dim)'  },
            ].map(r => (
              <div key={r.region} style={{ padding: '14px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: '700', color: r.color, fontFamily: 'var(--font-mono)' }}>{r.count}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{r.region} Team</div>
                <div style={{ marginTop: '8px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${members.length ? (r.count / members.length) * 100 : 0}%`, background: r.color, borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="High Risk Personnel" sub="Allocation above 80%">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {capacity
              .filter(m => (parseInt(m.allocated_percent) || 0) > 80)
              .sort((a, b) => (parseInt(b.allocated_percent) || 0) - (parseInt(a.allocated_percent) || 0))
              .map(m => {
                const pct   = parseInt(m.allocated_percent) || 0;
                const color = pct > 90 ? 'var(--red)' : 'var(--yellow)';
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div className="avatar" style={{ fontSize: '10px' }}>{m.name?.split(' ').map(n => n[0]).join('') || '?'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{m.name || 'Unknown'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{m.role || 'N/A'}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color, fontFamily: 'var(--font-mono)' }}>{pct}%</div>
                  </div>
                );
              })}
            {capacity.filter(m => (parseInt(m.allocated_percent) || 0) > 80).length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>✅ No high-risk personnel</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
