import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Projects from './pages/Projects';
import Allocations from './pages/Allocations';
import './App.css';

export default function App() {
  const [page, setPage] = useState('dashboard');

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'teams',     label: 'Teams',     icon: '👥' },
    { id: 'projects',  label: 'Projects',  icon: '📁' },
    { id: 'allocations', label: 'Allocations', icon: '📊' },
  ];

  const pages = {
    dashboard:   <Dashboard />,
    teams:       <Teams />,
    projects:    <Projects />,
    allocations: <Allocations />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{
        width: '220px', background: '#1a1a2e', color: '#fff',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0
      }}>
        <div style={{ padding: '0 20px 24px', fontSize: '15px', fontWeight: '600', color: '#a78bfa' }}>
          ⚡ BrandSparkX
        </div>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            background: page === n.id ? '#7c3aed' : 'transparent',
            border: 'none', color: '#fff', padding: '10px 20px',
            textAlign: 'left', cursor: 'pointer', fontSize: '14px',
            display: 'flex', gap: '10px', alignItems: 'center'
          }}>
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
      </aside>
      <main style={{ flex: 1, background: '#f8f9ff', padding: '24px', overflowY: 'auto' }}>
        {pages[page]}
      </main>
    </div>
  );
}