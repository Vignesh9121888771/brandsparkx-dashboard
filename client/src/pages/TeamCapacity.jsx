import { useEffect, useState } from 'react';
import { getCapacity } from '../services/api';

const statusInfo = (pct) => {
  const p = parseInt(pct) || 0;
  if (p > 90) return { label: 'Overbooked', color: 'var(--red)',    bg: 'var(--red-dim)'    };
  if (p > 70) return { label: 'Optimal',    color: 'var(--yellow)', bg: 'var(--yellow-dim)' };
  if (p > 0)  return { label: 'Available',  color: 'var(--green)',  bg: 'var(--green-dim)'  };
  return              { label: 'Bench',      color: 'var(--text-dim)', bg: 'var(--bg-hover)' };
};

export default function TeamCapacity() {
  const [capacity, setCapacity] = useState([]);
  const [filter, setFilter]     = useState('All');
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    getCapacity()
      .then(r => {
        setCapacity(r.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Capacity fetch error:", err);
        setError("Failed to load team capacity.");
        setLoading(false);
      });
  }, []);

  const filters = ['All', 'Overbooked', 'Optimal', 'Available', 'Bench'];
  const filtered = capacity.filter(m => {
    if (filter === 'All') return true;
    return statusInfo(m.allocated_percent).label === filter;
  });

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '100px' }}>Loading team capacity...</div>;
  if (error) return <div className="page" style={{ textAlign: 'center', padding: '100px', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Team Capacity</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage and forecast resource utilization across all squads.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: '20px', border: '1px solid',
            fontSize: '12px', fontWeight: '500',
            borderColor: filter === f ? 'var(--purple)' : 'var(--border)',
            background: filter === f ? 'var(--purple-dim)' : 'transparent',
            color: filter === f ? 'var(--purple-light)' : 'var(--text-dim)',
          }}>{f}</button>
        ))}
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 2fr 100px',
        padding: '10px 20px', background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
        fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em'
      }}>
        <span>Employee</span><span>Role</span><span>Region</span><span>Capacity (4w)</span><span>Status</span>
      </div>

      {/* Rows */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden' }}>
        {filtered.map((m, i) => {
          const pct    = parseInt(m.allocated_percent) || 0;
          const status = statusInfo(pct);
          const initials = m.name?.split(' ').map(n => n[0]).join('') || '?';
          return (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 2fr 100px',
              padding: '14px 20px', alignItems: 'center',
              background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)'}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'var(--purple-dim)', color: 'var(--purple-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '600', flexShrink: 0
                }}>{initials}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{m.name || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>ID #{m.id}</div>
                </div>
              </div>

              {/* Role */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{m.role || 'N/A'}</div>

              {/* Region */}
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                background: m.region === 'UAE' ? 'var(--blue-dim)' : 'var(--green-dim)',
                color: m.region === 'UAE' ? 'var(--blue)' : 'var(--green)',
                fontWeight: '500', width: 'fit-content'
              }}>{m.region || 'N/A'}</span>

              {/* Capacity bar */}
              <div style={{ paddingRight: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{pct}% allocated</span>
                  <span style={{ fontSize: '11px', color: status.color }}>{100 - pct}% free</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(pct, 100)}%`,
                    background: status.color, borderRadius: '3px',
                    transition: 'width 0.6s ease'
                  }} />
                </div>
              </div>

              {/* Status */}
              <span style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                background: status.bg, color: status.color,
                fontWeight: '600', textAlign: 'center'
              }}>{status.label}</span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center',
          color: 'var(--text-dim)', fontSize: '13px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', marginTop: '8px'
        }}>No employees match this filter</div>
      )}
    </div>
  );
}
