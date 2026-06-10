import { useEffect, useState } from 'react';
import { getTeams, getMembers } from '../services/api';

export default function Teams() {
  const [teams,   setTeams]   = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    getTeams().then(r   => setTeams(r.data.data));
    getMembers().then(r => setMembers(r.data.data));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1e1b4b' }}>Teams</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
        {teams.map(t => {
          const teamMembers = members.filter(m => m.team_id === t.id);
          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e1b4b' }}>{t.name}</div>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: t.region === 'UAE' ? '#dbeafe' : '#dcfce7',
                  color: t.region === 'UAE' ? '#1d4ed8' : '#16a34a'
                }}>{t.region}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>{teamMembers.length} members</div>
              {teamMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: '#ede9fe', color: '#7c3aed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600'
                  }}>{m.name.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}