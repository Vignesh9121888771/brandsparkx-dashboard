import { useEffect, useState } from 'react';
import { getMembers, getProjects, getCapacity, getTasks } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '20px', ...style
  }}>{children}</div>
);

const Metric = ({ label, value, sub, color = 'var(--text-primary)', icon }) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <span style={{ fontSize: '18px' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color, fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>{value}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{sub}</div>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-hover)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: 'var(--purple-light)' }}>{payload[0].value}% allocated</div>
    </div>
  );
};

export default function Dashboard({ role }) {
  const [members, setMembers]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [tasks, setTasks]       = useState([]);

  useEffect(() => {
    getMembers().then(r  => setMembers(r.data.data));
    getProjects().then(r => setProjects(r.data.data));
    getCapacity().then(r => setCapacity(r.data.data));
    getTasks().then(r    => setTasks(r.data.data));
  }, []);

  const active      = projects.filter(p => p.status === 'Active').length;
  const overloaded  = capacity.filter(c => parseInt(c.allocated_percent) > 90).length;
  const available   = capacity.filter(c => parseInt(c.allocated_percent) < 50).length;
  const avgCap      = capacity.length
    ? Math.round(capacity.reduce((s, c) => s + parseInt(c.allocated_percent), 0) / capacity.length)
    : 0;

  const chartData = capacity.map(m => ({
    name: m.name.split(' ')[0],
    value: parseInt(m.allocated_percent),
  }));

  const getBarColor = (v) => v > 90 ? 'var(--red)' : v > 70 ? 'var(--yellow)' : 'var(--green)';

  const upcoming = projects
    .filter(p => p.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);

  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const inProgress   = tasks.filter(t => t.status === 'In Progress').length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Command Center</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Real-time overview of agency operations and capacity.</p>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        <Metric label="Total Staff"       value={members.length}  sub="Across India & UAE"   icon="👥" />
        <Metric label="Active Projects"   value={active}          sub={`${projects.length} total`} icon="📁" />
        <Metric label="Overloaded Staff"  value={overloaded}      sub="Requires attention"   icon="⚠️" color={overloaded > 0 ? 'var(--red)' : 'var(--green)'} />
        <Metric label="Available Staff"   value={available}       sub="Capacity available"   icon="✅" color="var(--green)" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Workload chart */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Workload Distribution</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Current utilization across all staff</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              {[['var(--green)', 'Available'], ['var(--yellow)', 'Warning'], ['var(--red)', 'Over']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} domain={[0, 120]} tickFormatter={v => v + '%'} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* 90% line indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ height: '1px', flex: 1, background: 'var(--red)', opacity: 0.3 }} />
            <span style={{ fontSize: '11px', color: 'var(--red)', opacity: 0.7 }}>90% threshold</span>
          </div>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Upcoming Deadlines</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>Projects ending within 30 days</div>
          {upcoming.map(p => {
            const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const urgent = days <= 7;
            return (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-md)', marginBottom: '8px',
                border: `1px solid ${urgent ? 'var(--red)' : 'var(--border)'}`,
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{p.client}</div>
                </div>
                <div style={{
                  fontSize: '12px', fontWeight: '600', padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: urgent ? 'var(--red-dim)' : 'var(--bg-card)',
                  color: urgent ? 'var(--red)' : 'var(--text-dim)'
                }}>
                  {days > 0 ? `${days}d` : 'Today'}
                </div>
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No upcoming deadlines</div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Task summary */}
        <Card>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Task Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Pending',     value: pendingTasks,                               color: 'var(--yellow)' },
              { label: 'In Progress', value: inProgress,                                 color: 'var(--blue)'   },
              { label: 'Completed',   value: tasks.filter(t => t.status === 'Completed').length, color: 'var(--green)'  },
              { label: 'Blocked',     value: tasks.filter(t => t.status === 'Blocked').length,   color: 'var(--red)'    },
            ].map(t => (
              <div key={t.label} style={{
                padding: '14px', background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: t.color, fontFamily: 'var(--font-mono)' }}>{t.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Active projects */}
        <Card>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Active Projects</div>
          {projects.slice(0, 4).map(p => {
            const colors = { Active: 'var(--green)', 'In Review': 'var(--yellow)', Planning: 'var(--purple-light)', Completed: 'var(--text-dim)' };
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors[p.status], flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '500' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{p.client}</div>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: p.status === 'Active' ? 'var(--green-dim)' : p.status === 'In Review' ? 'var(--yellow-dim)' : 'var(--purple-dim)',
                  color: colors[p.status], fontWeight: '500'
                }}>{p.status}</span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}