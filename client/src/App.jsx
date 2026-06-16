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
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState('dashboard');
  const [ready,       setReady]       = useState(false);
  const [search,      setSearch]      = useState('');
  const [alerts,      setAlerts]      = useState([]);
  const [collapsed,   setCollapsed]   = useState(false);
  const [showNotif,   setShowNotif]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef   = useRef();
  const profileRef = useRef();

  useEffect(() => {
    const saved = localStorage.getItem('bsx_user');
    if (saved) setUser(JSON.parse(saved));
    setReady(true);
  }, []);

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
    const check = async () => {
      try {
        const res  = await fetch('http://localhost:5000/api/projects', {
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

  const handleSearch = val => {
    setSearch(val);
    if (val.length >= 2) {
      const target = findPage(val);
      if (target && target !== page) setPage(target);
    }
  };

  const navigate = p => {
    setPage(p);
    setShowNotif(false);
    setShowProfile(false);
  };

  const handleLogin  = u => { setUser(u); setPage('dashboard'); };
  const handleLogout = () => {
    localStorage.removeItem('bsx_token');
    localStorage.removeItem('bsx_user');
    setUser(null);
    setShowProfile(false);
  };

  if (!ready) return null;
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
    manager:   <ManagerPanel user={user} />,
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

      {/* ── Sidebar ─────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

        {/* Logo + Toggle row */}
        <div className="sidebar-header">
          {!collapsed && (
            <img
              src="https://res.cloudinary.com/dosxhopuv/image/upload/w_400,h_120,c_fit,q_100,dpr_2.0/v1781443305/brandspark_logo_hq_xqwxdf.png"
              alt="BrandSparkX"
              style={{
                height: '50px',
                width: 'auto',
                objectFit: 'contain',
                maxWidth: '200px',
                flex: 1,
                imageRendering: 'crisp-edges',
                animation: 'slideIn 0.2s ease',
              }}
            />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="sidebar-toggle-btn"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="5" height="14" rx="1.5" opacity="0.9"/>
              <rect x="8" y="1" width="7" height="3" rx="1"/>
              <rect x="8" y="6" width="7" height="3" rx="1"/>
              <rect x="8" y="11" width="7" height="4" rx="1"/>
            </svg>
          </button>
        </div>

        {/* Deadline alert */}
        {alerts.length > 0 && (
          collapsed ? (
            /* Collapsed: tiny red dot only */
            <div
              onClick={() => navigate('calendar')}
              title={`${alerts.length} urgent deadline${alerts.length > 1 ? 's' : ''}`}
              style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: 'var(--red)',
                margin: '0 auto 8px',
                cursor: 'pointer',
                boxShadow: '0 0 6px var(--red)',
                animation: 'pulse 2s infinite',
              }}
            />
          ) : (
            <div className="sidebar-alert" onClick={() => navigate('calendar')}>
              <div className="sidebar-alert-title">
                ⚠ {alerts.length} urgent deadline{alerts.length > 1 ? 's' : ''}
              </div>
              {alerts.slice(0,2).map(a => {
                const days = Math.ceil((new Date(a.deadline) - new Date()) / (1000*60*60*24));
                return <div key={a.id} className="sidebar-alert-item">{a.name} — {days}d</div>;
              })}
            </div>
            )
          )}

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!collapsed && <div className="nav-section-label">Main</div>}
            {mainNav.map(n => <NavBtn key={n.id} n={n} />)}
          </div>
          {toolsNav.length > 0 && (
            <div className="nav-section">
              {!collapsed && <div className="nav-section-label">Tools</div>}
              {toolsNav.map(n => <NavBtn key={n.id} n={n} />)}
            </div>
          )}
        </nav>

        {/* Role badge */}
        {!collapsed && (
          <div className="role-badge" style={{
            background: isManager ? 'var(--purple-dim)' : 'var(--green-dim)',
            border: `1px solid ${isManager ? 'rgba(124,58,237,0.3)' : 'rgba(16,185,129,0.3)'}`,
            color: isManager ? 'var(--purple-light)' : 'var(--green)',
            animation: 'slideIn 0.2s ease'
          }}>
            {isManager ? `⚙ Manager${userRegion !== 'All' ? ` · ${userRegion}` : ''}` : '◎ Employee'}
          </div>
        )}

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="user-card" onClick={() => setShowProfile(!showProfile)}>
            <div className="avatar" style={{ fontSize: '11px', flexShrink: 0 }}>{initials}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0, animation: 'slideIn 0.2s ease' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={e => { e.stopPropagation(); handleLogout(); }}
                title="Logout"
                style={{
                  background: 'none', border: 'none', color: 'var(--text-dim)',
                  cursor: 'pointer', fontSize: '13px', padding: '2px', flexShrink: 0,
                  transition: 'var(--transition)'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >⏻</button>
            )}
          </div>

          {/* Profile dropdown */}
          {showProfile && (
            <div className="dropdown" style={{
              bottom: '100%', top: 'auto',
              left: collapsed ? '70px' : '10px',
              right: 'auto', width: '200px', marginBottom: '8px'
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>{user.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>{user.email}</div>
              </div>
              {[
                { icon: '⬡', label: 'Dashboard',   action: () => navigate('dashboard') },
                { icon: '◷', label: 'My Requests', action: () => navigate('requests')  },
                { icon: '▦', label: 'Calendar',    action: () => navigate('calendar')  },
              ].map(item => (
                <button key={item.label} className="dropdown-item"
                  onClick={() => { item.action(); setShowProfile(false); }}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
              <button className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--red)' }}>
                <span>⏻</span>Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────── */}
      <div className="main-area">

        {/* Topbar */}
        <div className="topbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search anything..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearch('')}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '8px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '11px'
                }}
              >✕</button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative', padding: '6px',
                display: 'flex', alignItems: 'center',
                transition: 'var(--transition)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '18px' }}>🔔</span>
              {alerts.length > 0 && (
                <div style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'var(--red)', color: '#fff',
                  fontSize: '8px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-secondary)',
                  animation: 'pulse 2s infinite'
                }}>{alerts.length}</div>
              )}
            </button>

            {showNotif && (
              <div className="dropdown" style={{ width: '300px' }}>
                <div style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>Notifications</div>
                  {alerts.length > 0 && <span className="badge badge-red">{alerts.length} urgent</span>}
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>All clear ✅</div>
                  ) : alerts.map(a => {
                    const days = Math.ceil((new Date(a.deadline) - new Date()) / (1000*60*60*24));
                    return (
                      <div key={a.id} className="dropdown-item"
                        onClick={() => navigate('calendar')}
                        style={{ borderBottom: '1px solid var(--border)', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '14px' }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '500' }}>{a.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--red)' }}>{days} day{days !== 1 ? 's' : ''} left · {a.client}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => navigate('calendar')}
                    style={{ background: 'none', border: 'none', color: 'var(--purple-light)', fontSize: '11px', cursor: 'pointer', fontWeight: '500' }}
                  >View Calendar →</button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div
              className="avatar"
              style={{ cursor: 'pointer', fontSize: '11px' }}
              onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--purple-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >{initials}</div>

            {showProfile && (
              <div className="dropdown">
                <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '13px', borderRadius: '50%' }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{user.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{user.email}</div>
                    <div style={{ fontSize: '10px', color: isManager ? 'var(--purple-light)' : 'var(--green)', fontWeight: '600', marginTop: '2px' }}>
                      {isManager ? `Manager${userRegion !== 'All' ? ` · ${userRegion}` : ''}` : 'Employee'}
                    </div>
                  </div>
                </div>
                {[
                  { icon: '⬡', label: 'Dashboard',   action: () => navigate('dashboard') },
                  { icon: '◷', label: 'My Requests', action: () => navigate('requests')  },
                  { icon: '▦', label: 'Calendar',    action: () => navigate('calendar')  },
                ].map(item => (
                  <button key={item.label} className="dropdown-item"
                    onClick={() => { item.action(); setShowProfile(false); }}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}
                <button className="dropdown-item" onClick={handleLogout}
                  style={{ color: 'var(--red)', borderTop: '1px solid var(--border)' }}>
                  <span>⏻</span>Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          <div key={page}>
            {pages[page] || pages.dashboard}
          </div>
        </div>
      </div>
    </div>
  );
}