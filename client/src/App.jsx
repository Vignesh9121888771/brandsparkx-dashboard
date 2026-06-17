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
  { keywords: ['dashboard','overview','command','metrics','summary','home','greeting'], page: 'dashboard' },
  { keywords: ['team','capacity','members','employees','staff','utilization','allocation','overbooked'], page: 'team' },
  { keywords: ['projects','portfolio','client','deadline','status','progress','active'], page: 'projects' },
  { keywords: ['requests','leave','permission','objection','reallocation','approval','request'], page: 'requests' },
  { keywords: ['manager','assign','task','bulk','ai','suggestion','panel'], page: 'manager' },
  { keywords: ['analytics','reports','charts','forecast','burnout','risk','data'], page: 'analytics' },
  { keywords: ['calendar','schedule','dates','upcoming','deadlines','events'], page: 'calendar' },
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
  const [page,        setPage]        = useState('dashboard');
  const [search,      setSearch]      = useState('');
  const [collapsed,   setCollapsed]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef   = useRef();
  const profileRef = useRef();

  useEffect(() => {
    const handler = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   { /* closed */ }
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = val => {
    setSearch(val);
    const found = findPage(val);
    if (found) setPage(found);
  };

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem('bsx_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    localStorage.removeItem('bsx_token');
    localStorage.removeItem('bsx_user');
    setUser(null);
    setShowProfile(false);
  };

  const navigate = (p) => {
    setPage(p);
    window.scrollTo(0,0);
  };

  if (!user)  return <Login onLogin={handleLogin} />;

  const isManager  = user.role === 'manager';
  const NAV        = isManager ? MANAGER_NAV : EMPLOYEE_NAV;
  const initials   = user.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  const userRegion = user.region || 'All';

  const mainNav  = NAV.filter(n => n.section === 'main');
  const toolsNav = NAV.filter(n => n.section === 'tools');

  const pages = {
    dashboard: <Dashboard    role={user.role} user={user} search={search} defaultRegion={userRegion} onNavigate={navigate} />,
    team:      <TeamCapacity role={user.role} user={user} search={search} defaultRegion={userRegion} />,
    projects:  <Projects     role={user.role} user={user} search={search} defaultRegion={userRegion} />,
    requests:  <Requests     role={user.role} user={user} search={search} />,
    manager:   <ManagerPanel />,
    analytics: <Analytics />,
    calendar:  <Calendar     user={user} />,
  };

  const NavBtn = ({ n }) => (
    <button
      className={`nav-btn ${page === n.id ? 'active' : ''}`}
      onClick={() => navigate(n.id)}
      title={collapsed ? n.label : ''}
    >
      <span className="nav-icon">{n.icon}</span>
      {!collapsed && <span className="nav-label">{n.label}</span>}
    </button>
  );

  return (
    <div className="app-layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrap">
            <div className="logo-icon">B</div>
            {!collapsed && <div className="logo-text">BrandSpark<span>X</span></div>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className="nav-section">
          {!collapsed && <div className="section-label">Main</div>}
          {mainNav.map(n => <NavBtn key={n.id} n={n} />)}
        </div>

        <div className="nav-section">
          {!collapsed && <div className="section-label">Tools</div>}
          {toolsNav.map(n => <NavBtn key={n.id} n={n} />)}
        </div>

        <div style={{ flex: 1 }} />

        {!collapsed && (
          <div className="region-tag">
            {userRegion === 'All' ? '🌐 Global Access' : `📍 ${userRegion} Office`}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-card" onClick={() => setShowProfile(!showProfile)}>
            <div className="avatar" style={{ fontSize: '11px', flexShrink: 0 }}>{initials}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search anything..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div
              className="avatar"
              style={{ cursor: 'pointer', fontSize: '11px' }}
              onClick={() => setShowProfile(!showProfile)}
            >{initials}</div>
            {showProfile && (
              <div className="dropdown">
                <button className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--red)' }}>
                  Sign Out
                </button>
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
