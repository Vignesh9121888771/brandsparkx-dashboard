import { useState } from 'react';
import { login, register, registerManager } from '../services/api';

const inp = {
  width: '100%', padding: '11px 13px',
  background: '#16161f', border: '1px solid #2a2a3a',
  borderRadius: '8px', color: '#f1f1f5',
  fontSize: '13px', outline: 'none',
  transition: 'border-color 0.2s',
};

export default function Login({ onLogin }) {
  const [mode,      setMode]      = useState('login');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [isManager, setIsManager] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', manager_code: '', region: 'All'
  });

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Email and password are required');
    if (mode === 'register' && !form.name) return setError('Name is required');
    if (mode === 'register' && isManager && !form.manager_code) return setError('Manager access code required');

    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await login({ email: form.email, password: form.password });
      } else if (isManager) {
        res = await registerManager({
          name: form.name, email: form.email,
          password: form.password, manager_code: form.manager_code,
          region: form.region
        });
      } else {
        res = await register({ name: form.name, email: form.email, password: form.password });
      }

      if (res.data.token) {
        localStorage.setItem('bsx_token', res.data.token);
        localStorage.setItem('bsx_user',  JSON.stringify(res.data.user));
        onLogin(res.data.user);
      } else {
        setError('Server returned an empty response');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Check your credentials and server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: '700', margin: '0 auto 12px', color: '#fff',
            boxShadow: '0 0 30px rgba(124,58,237,0.3)'
          }}>B</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#f1f1f5', marginBottom: '3px' }}>BrandSparkX</div>
          <div style={{ fontSize: '12px', color: '#606075' }}>Enterprise Resource Management</div>
        </div>

        <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', background: '#0a0a0f', borderRadius: '8px', padding: '3px', marginBottom: '20px', gap: '3px' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
                flex: 1, padding: '7px', border: 'none', borderRadius: '6px',
                fontSize: '12px', fontWeight: '500',
                background: mode === m ? '#7c3aed' : 'transparent',
                color: mode === m ? '#fff' : '#606075', cursor: 'pointer',
                transition: 'all 0.2s'
              }}>{m === 'login' ? 'Sign In' : 'Register'}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mode === 'register' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: '#0a0a0f',
                borderRadius: '8px', border: '1px solid #2a2a3a', cursor: 'pointer'
              }} onClick={() => setIsManager(!isManager)}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  background: isManager ? '#7c3aed' : 'transparent',
                  border: `2px solid ${isManager ? '#7c3aed' : '#606075'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: '#fff'
                }}>{isManager ? '✓' : ''}</div>
                <span style={{ fontSize: '12px', color: '#a0a0b8' }}>Register as Manager</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label style={{ fontSize: '10px', color: '#606075', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name *</label>
                <input style={inp} placeholder='Your full name' value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            )}

            <div>
              <label style={{ fontSize: '10px', color: '#606075', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email *</label>
              <input style={inp} type='email' placeholder='you@brandsparkx.com' value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#606075', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password *</label>
              <input style={inp} type='password' placeholder='Min. 8 characters' value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {mode === 'register' && isManager && (
              <>
                <div>
                  <label style={{ fontSize: '10px', color: '#606075', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Region</label>
                  <select style={inp} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}>
                    <option value='All'>All Regions</option>
                    <option value='India'>India</option>
                    <option value='UAE'>UAE</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#606075', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager Access Code *</label>
                  <input style={inp} type='password' placeholder='Enter access code' value={form.manager_code}
                    onChange={e => setForm({ ...form, manager_code: e.target.value })} />
                </div>
              </>
            )}

            {error && (
              <div style={{ padding: '9px 12px', background: '#450a0a', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '12px', color: '#ef4444' }}>{error}</div>
            )}

            <button onClick={submit} disabled={loading} style={{
              padding: '11px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: '4px',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              transition: 'all 0.2s'
            }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : isManager ? 'Create Manager Account' : 'Create Account'}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#606075' }}>BrandSparkX ERM · Secure Portal</div>
      </div>
    </div>
  );
}
