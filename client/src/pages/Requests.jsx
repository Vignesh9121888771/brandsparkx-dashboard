import { useEffect, useState } from 'react';
import { getRequests, createRequest, getMembers } from '../services/api';

const typeColors = {
  Leave:       { color: 'var(--blue)',          bg: 'var(--blue-dim)'   },
  Permission:  { color: 'var(--purple-light)',  bg: 'var(--purple-dim)' },
  Objection:   { color: 'var(--red)',           bg: 'var(--red-dim)'    },
  Reallocation:{ color: 'var(--yellow)',        bg: 'var(--yellow-dim)' },
};

const statusColors = {
  Pending:  { color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
  Approved: { color: 'var(--green)',  bg: 'var(--green-dim)'  },
  Rejected: { color: 'var(--red)',    bg: 'var(--red-dim)'    },
};

const inp = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  fontSize: '13px', outline: 'none',
};

export default function Requests({ role }) {
  const [requests, setRequests] = useState([]);
  const [members,  setMembers]  = useState([]);
  const [form, setForm] = useState({ member_id: '', type: 'Leave', title: '', description: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);

  const load = () => {
    getRequests().then(r => setRequests(r.data.data));
    getMembers().then(r  => setMembers(r.data.data));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.member_id || !form.title) return alert('Please fill all required fields');
    setLoading(true);
    await createRequest(form);
    setForm({ member_id: '', type: 'Leave', title: '', description: '', start_date: '', end_date: '' });
    load();
    setLoading(false);
  };

  return (
    <div className="page">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Requests</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
          {role === 'employee' ? 'Submit leave, permission, objection, or reallocation requests.' : 'View and manage all employee requests.'}
        </p>
      </div>

      {/* Submit form */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Submit a Request</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>EMPLOYEE *</label>
            <select style={inp} value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}>
              <option value=''>Select employee</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>REQUEST TYPE *</label>
            <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {['Leave', 'Permission', 'Objection', 'Reallocation'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>TITLE *</label>
            <input style={inp} placeholder='Brief title of your request' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>DESCRIPTION</label>
            <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} placeholder='Provide more details...' value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>START DATE</label>
            <input style={inp} type='date' value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>END DATE</label>
            <input style={inp} type='date' value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <button onClick={submit} disabled={loading} style={{
          background: 'var(--purple)', color: '#fff', border: 'none',
          padding: '10px 24px', borderRadius: 'var(--radius-sm)',
          fontSize: '13px', fontWeight: '500', opacity: loading ? 0.7 : 1
        }}>{loading ? 'Submitting...' : 'Submit Request'}</button>
      </div>

      {/* Requests list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.map(r => {
          const tc = typeColors[r.type]   || typeColors.Leave;
          const sc = statusColors[r.status] || statusColors.Pending;
          return (
            <div key={r.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '16px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'var(--purple-dim)', color: 'var(--purple-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '600', flexShrink: 0
              }}>{r.member_name?.split(' ').map(n => n[0]).join('')}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{r.title}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: tc.bg, color: tc.color, fontWeight: '500' }}>{r.type}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {r.member_name} · {r.member_role}
                  {r.description && ` · ${r.description.slice(0, 60)}...`}
                </div>
              </div>

              {r.start_date && (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0 }}>
                  <div>{new Date(r.start_date).toLocaleDateString('en-IN')}</div>
                  {r.end_date && <div>→ {new Date(r.end_date).toLocaleDateString('en-IN')}</div>}
                </div>
              )}

              <span style={{
                fontSize: '11px', padding: '4px 12px', borderRadius: '20px',
                background: sc.bg, color: sc.color, fontWeight: '600', flexShrink: 0
              }}>{r.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}