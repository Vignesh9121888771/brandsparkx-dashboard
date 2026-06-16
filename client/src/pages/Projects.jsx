import { useEffect, useState } from 'react';
import { getProjects } from '../services/api';

const statusColors = {
  Active:     { color: 'var(--green)',        bg: 'var(--green-dim)'  },
  'In Review':{ color: 'var(--yellow)',       bg: 'var(--yellow-dim)' },
  Planning:   { color: 'var(--purple-light)', bg: 'var(--purple-dim)' },
  Completed:  { color: 'var(--text-dim)',     bg: 'var(--bg-hover)'   },
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter]     = useState('All');

  useEffect(() => { getProjects().then(r => setProjects(r.data.data)); }, []);

  const statuses = ['All', 'Active', 'In Review', 'Planning', 'Completed'];
  const filtered = filter === 'All' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Projects Portfolio</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Active engagements and resource utilization.</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: '20px', border: '1px solid',
            fontSize: '12px', fontWeight: '500',
            borderColor: filter === s ? 'var(--purple)' : 'var(--border)',
            background: filter === s ? 'var(--purple-dim)' : 'transparent',
            color: filter === s ? 'var(--purple-light)' : 'var(--text-dim)',
          }}>{s}</button>
        ))}
      </div>

      {/* Project cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {filtered.map(p => {
          const sc   = statusColors[p.status] || statusColors.Planning;
          const days = p.deadline
            ? Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
          const urgent = days !== null && days <= 7;
          const progress = p.status === 'Completed' ? 100
            : p.status === 'Active' ? 65
            : p.status === 'In Review' ? 85 : 20;

          return (
            <div key={p.id} style={{
              background: 'var(--bg-card)', border: `1px solid var(--border)`,
              borderRadius: 'var(--radius-lg)', padding: '20px',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{
                  fontSize: '10px', padding: '3px 10px', borderRadius: '20px',
                  background: sc.bg, color: sc.color, fontWeight: '600'
                }}>{p.status.toUpperCase()}</span>
                <span style={{
                  fontSize: '10px', padding: '3px 10px', borderRadius: '20px',
                  background: p.region === 'UAE' ? 'var(--blue-dim)' : 'var(--green-dim)',
                  color: p.region === 'UAE' ? 'var(--blue)' : 'var(--green)', fontWeight: '500'
                }}>{p.region}</span>
              </div>

              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>{p.client}</div>

              {/* Progress */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Progress</span>
                  <span style={{ fontSize: '11px', color: sc.color, fontWeight: '600' }}>{progress}%</span>
                </div>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: sc.color, borderRadius: '2px' }} />
                </div>
              </div>

              {/* Deadline */}
              {days !== null && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${urgent ? 'var(--red)' : 'var(--border)'}`
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Deadline</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: urgent ? 'var(--red)' : 'var(--text-secondary)' }}>
                    {new Date(p.deadline).toLocaleDateString('en-IN')}
                    {urgent && ' ⚠️'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}