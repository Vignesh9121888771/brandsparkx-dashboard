import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import TeamCapacity from './pages/TeamCapacity';
import Projects from './pages/Projects';
import Requests from './pages/Requests';
import ManagerPanel from './pages/ManagerPanel';
import Analytics from './pages/Analytics';
import './App.css';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',     icon: '▦' },
  { id: 'team',         label: 'Team Capacity',  icon: '◎' },
  { id: 'projects',     label: 'Projects',       icon: '◫' },
  { id: 'requests',     label: 'Requests',       icon: '◷' },
  { id: 'manager',      label: 'Manager Panel',  icon: '◈' },
  { id: 'analytics',    label: 'Analytics',      icon: '◉' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [role, setRole] = useState('manager');

  const pages = {
    dashboard: <Dashboard role={role} />,
    team:      <TeamCapacity role={role} />,
    projects:  <Projects role={role} />,
    requests:  <Requests role={role} />,
    manager:   <ManagerPanel />,
    analytics: <Analytics />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Sidebar */}
      <aside style={{
        width: '220px', background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '0', flexShrink: 0, position: 'fixed',
        height: '100vh', zIndex: 100
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'var(--purple)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '700'
            }}>B</div>
            <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>BrandSparkX</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', paddingLeft: '38px' }}>Enterprise ERM</div>
        </div>

        {/* Role toggle */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', background: 'var(--bg-card)',
            borderRadius: 'var(--radius-sm)', padding: '3px', gap: '2px'
          }}>
            {['manager', 'employee'].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '5px', border: 'none',
                borderRadius: '4px', fontSize: '11px', fontWeight: '500',
                background: role === r ? 'var(--purple)' : 'transparent',
                color: role === r ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.2s'
              }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV.filter(n => role === 'manager' || n.id !== 'manager').map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: '10px', padding: '10px 20px', border: 'none',
              background: page === n.id
                ? 'linear-gradient(90deg, var(--purple-dim), transparent)'
                : 'transparent',
              color: page === n.id ? 'var(--purple-light)' : 'var(--text-secondary)',
              fontSize: '13px', fontWeight: page === n.id ? '500' : '400',
              textAlign: 'left', transition: 'all 0.15s',
              borderLeft: page === n.id ? '2px solid var(--purple)' : '2px solid transparent',
            }}>
              <span style={{ fontSize: '15px' }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'var(--purple-dim)', color: 'var(--purple-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '600'
          }}>
            {role === 'manager' ? 'AM' : 'EM'}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '500' }}>
              {role === 'manager' ? 'Agency Manager' : 'Employee'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {role === 'manager' ? 'Operations' : 'Team Member'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1, marginLeft: '220px',
        padding: '28px 32px', overflowY: 'auto',
        minHeight: '100vh'
      }}>
        {pages[page]}
      </main>
    </div>
  );
}