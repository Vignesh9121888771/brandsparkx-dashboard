import { useState, useEffect, useRef } from 'react';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import TeamCapacity from './pages/TeamCapacity';
import Projects   from './pages/Projects';
import Requests   from './pages/Requests';
import ManagerPanel from './pages/ManagerPanel';
import Analytics  from './pages/Analytics';
import Calendar   from './pages/Calendar';
import './App.css';

const MANAGER_NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: '⬡', section: 'main' },
  { id: 'team',      label: 'Team',        icon: '◎', section: 'main' },
  { id: 'projects',  label: 'Projects',    icon: '◫', section: 'main' },
  { id: 'requests',  label: 'Requests',    icon: '◷', section: 'main' },
  { id: 'manager',   label: 'Manager',     icon: '◈', section: 'tools' },
  { id: 'analytics', label: 'Analytics',   icon: '◉', section: 'tools' },
  { id: 'calendar',  label: 'Calendar',    icon: '▦', section: 'tools' },
];

const EMPLOYEE_NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: '⬡', section: 'main' },
  { id: 'projects',  label: 'Projects',   icon: '◫', section: 'main' },
  { id: 'requests',  label: 'Requests',   icon: '◷', section: 'main' },
  { id: 'calendar',  label: 'Calendar',   icon: '▦', section: 'main' },
];

const SEARCH_INDEX = [
  { keywords: ['dashboard','overview','home'], page: 'dashboard' },
  { keywords: ['team','capacity','utilization'], page: 'team' },
  { keywords: ['projects','portfolio','active'], page: 'projects' },
  { keywords: ['requests','leave','approval'], page: 'requests' },
  { keywords: ['manager','assign','onboarding'], page: 'manager' },
  { keywords: ['analytics','reports','data'], page: 'analytics' },
  { keywords: ['calendar','schedule','deadlines'], page: 'calendar' },
];

function findPage(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  let best = null, bestScore = 0;
  for (const item of SEARCH_INDEX) {
    for (const kw of item.keywords) {
      if (kw.includes(q) || q.includes(kw)) {
        const score = kw === q ? 100 : kw.startsWith(q) ? 80 : q.startsWith(kw) ? 70 : 50;
        if (score > bestScore) { bestScore = score; best = item.page; }
      }
    }
  }
  return best;
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bsx_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('dashboard');
  const [ready] = useState(true);
  const [search, setSearch] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef   = useRef();
  const profileRef = useRef();

  useEffect(() => {
    const handler = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;

    const getBaseURL = () => {
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
      }
      return 'https://brandsparkx-dashboard.onrender.com/api';
    };

    const API_BASE = getBaseURL();

    const check = async () => {
      try {
        const res  = await fetch(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('bsx_token')}` }
        });
        const data = await res.json();
        const urgent = (data.data || []).filter(p => {
          if (!p.deadline || p.status === 'Completed') return false;
          const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
          return days <= 7 && days >= 0;
        });
        setAlerts(urgent);
      } catch (e) { console.error(e); }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('bsx_token');
    localStorage.removeItem('bsx_user');
    setUser(null);
    setPage('dashboard');
  };

  const navigate = (id) => {
    setPage(id);
    window.scrollTo(0, 0);
  };

  const handleSearch = (val) => {
    setSearch(val);
    const match = findPage(val);
    if (match) navigate(match);
  };

  if (!ready) return <div className="loading-state">Initializing...</div>;
  if (!user)  return <Login onLogin={u => setUser(u)} />;

  const isManager = user.role === 'manager';
  const navItems  = isManager ? MANAGER_NAV : EMPLOYEE_NAV;
  const userRegion = user.region || 'All';
  const initials   = user.name?.split(' ').map(n => n[0]).join('') || '?';

  const pages = {
    dashboard: <Dashboard user={user} search={search} defaultRegion={userRegion} onNavigate={navigate} />,
    team:      <TeamCapacity search={search} defaultRegion={userRegion} />,
    projects:  <Projects user={user} search={search} />,
    requests:  <Requests role={user.role} user={user} search={search} />,
    manager:   <ManagerPanel />,
    analytics: <Analytics />,
    calendar:  <Calendar />,
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box">B</div>
          {!collapsed && <span className="logo-text">BrandSparkX</span>}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">{collapsed ? '—' : 'Operations'}</div>
          {navItems.filter(i => i.section === 'main').map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: '16px' }}>{collapsed ? '—' : 'System'}</div>
          {navItems.filter(i => i.section === 'tools').map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-info">
          {!collapsed && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Region</div>}
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
             {collapsed ? userRegion[0] : `${user.role === 'manager' ? 'MGR' : 'EMP'} · ${userRegion}`}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-card" onClick={() => setShowProfile(!showProfile)}>
            <div className="avatar" style={{ fontSize: '11px', flexShrink: 0 }}>{initials}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={e => { e.stopPropagation(); handleLogout(); }} title="Logout" style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'13px' }}>⏻</button>
            )}
          </div>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search anything..." value={search} onChange={e => handleSearch(e.target.value)} />
          </div>

          <div style={{ flex: 1 }} />

          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }} style={{ background:'none', border:'none', cursor:'pointer', position:'relative', padding:'6px' }}>
              <span style={{ fontSize:'18px' }}>🔔</span>
              {alerts.length > 0 && <div className="notif-badge">{alerts.length}</div>}
            </button>
            {showNotif && (
              <div className="dropdown" style={{ width: '300px' }}>
                <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600' }}>Notifications</div>
                  {alerts.length > 0 && <span className="badge badge-red">{alerts.length} urgent</span>}
                </div>
                <div style={{ maxHeight:'240px', overflowY:'auto' }}>
                  {alerts.length === 0 ? <div style={{ padding:'20px', textAlign:'center', color:'var(--text-dim)', fontSize:'12px' }}>All clear ✅</div> : alerts.map(a => (
                    <div key={a.id} className="dropdown-item" onClick={() => navigate('projects')}>
                       <div style={{ fontSize:'12px', fontWeight:'500' }}>{a.name}</div>
                       <div style={{ fontSize:'11px', color:'var(--red)' }}>Deadline: {new Date(a.deadline).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} style={{ position: 'relative', marginLeft:'12px' }}>
            <div className="avatar" style={{ cursor: 'pointer', fontSize: '11px' }} onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}>{initials}</div>
            {showProfile && (
              <div className="dropdown">
                <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{user.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{user.role} · {user.region}</div>
                </div>
                <button className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--red)' }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>

        <div className="page-content">
          {pages[page] || pages.dashboard}
        </div>
      </div>
    </div>
  );
}
