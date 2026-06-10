import { useEffect, useState } from 'react';
import { getProjects } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => { getProjects().then(r => setProjects(r.data.data)); }, []);

  const statusColors = {
    Active: { bg: '#dcfce7', color: '#16a34a' },
    'In Review': { bg: '#fef9c3', color: '#d97706' },
    Planning: { bg: '#ede9fe', color: '#7c3aed' },
    Completed: { bg: '#f3f4f6', color: '#6b7280' },
  };

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1e1b4b' }}>Projects</h1>
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Project', 'Client', 'Region', 'Status', 'Deadline'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827' }}>{p.name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{p.client}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                    background: p.region === 'UAE' ? '#dbeafe' : '#dcfce7',
                    color: p.region === 'UAE' ? '#1d4ed8' : '#16a34a'
                  }}>{p.region}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                    ...statusColors[p.status]
                  }}>{p.status}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                  {p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}