import { useEffect, useState } from 'react';
import { getMembers, getProjects, getCapacity } from '../services/api';

export default function Dashboard() {
  const [members,  setMembers]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState([]);

  useEffect(() => {
    getMembers().then(r  => setMembers(r.data.data));
    getProjects().then(r => setProjects(r.data.data));
    getCapacity().then(r => setCapacity(r.data.data));
  }, []);

  const active = projects.filter(p => p.status === 'Active').length;
  const overloaded = capacity.filter(c => parseInt(c.allocated_percent) > 90).length;

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1e1b4b' }}>
        Team capacity overview
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total members',   value: members.length,  sub: 'Across India & UAE' },
          { label: 'Active projects', value: active,          sub: `${projects.length} total` },
          { label: 'Avg capacity',    value: capacity.length ? Math.round(capacity.reduce((s,c) => s + parseInt(c.allocated_percent), 0) / capacity.length) + '%' : '0%', sub: 'Team average' },
          { label: 'Overallocated',   value: overloaded,      sub: 'Above 90%', danger: true },
        ].map(c => (
          <div key={c.label} style={{
            background: '#fff', borderRadius: '10px', padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: c.danger ? '#dc2626' : '#1e1b4b' }}>{c.value}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px', color: '#1e1b4b' }}>Team capacity</h2>
          {capacity.map(m => {
            const pct = parseInt(m.allocated_percent);
            const color = pct > 90 ? '#dc2626' : pct > 60 ? '#7c3aed' : '#16a34a';
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: '#ede9fe', color: '#7c3aed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '600', flexShrink: 0
                }}>{m.name.split(' ').map(n => n[0]).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{m.role}</div>
                </div>
                <div style={{ width: '80px' }}>
                  <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '3px' }}/>
                  </div>
                  <div style={{ fontSize: '11px', color, textAlign: 'right', marginTop: '2px' }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px', color: '#1e1b4b' }}>Active projects</h2>
          {projects.map(p => {
            const colors = { Active: '#16a34a', 'In Review': '#d97706', Planning: '#7c3aed', Completed: '#6b7280' };
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[p.status], flexShrink: 0 }}/>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#111827' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{p.client}</div>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500',
                  background: p.status === 'Active' ? '#dcfce7' : p.status === 'In Review' ? '#fef9c3' : '#ede9fe',
                  color: colors[p.status]
                }}>{p.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}