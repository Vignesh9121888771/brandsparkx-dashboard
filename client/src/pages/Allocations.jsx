import { useEffect, useState } from 'react';
import { getAllocations, getMembers, getProjects, createAllocation, deleteAllocation } from '../services/api';

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [members,     setMembers]     = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [form,        setForm]        = useState({ member_id: '', project_id: '', allocation_percent: '', start_date: '', end_date: '' });

  const load = () => {
    getAllocations().then(r => setAllocations(r.data.data));
    getMembers().then(r     => setMembers(r.data.data));
    getProjects().then(r    => setProjects(r.data.data));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.member_id || !form.project_id || !form.allocation_percent || !form.start_date || !form.end_date)
      return alert('Please fill all fields');
    await createAllocation(form);
    setForm({ member_id: '', project_id: '', allocation_percent: '', start_date: '', end_date: '' });
    load();
  };

  const remove = async (id) => { await deleteAllocation(id); load(); };

  const sel = { padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '100%' };

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1e1b4b' }}>Allocations</h1>

      <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px', color: '#1e1b4b' }}>Add allocation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '12px' }}>
          <select style={sel} value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})}>
            <option value=''>Member</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select style={sel} value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
            <option value=''>Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input style={sel} type='number' placeholder='% (1-100)' value={form.allocation_percent}
            onChange={e => setForm({...form, allocation_percent: e.target.value})} min='1' max='100'/>
          <input style={sel} type='date' value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}/>
          <input style={sel} type='date' value={form.end_date}   onChange={e => setForm({...form, end_date: e.target.value})}/>
        </div>
        <button onClick={submit} style={{
          background: '#7c3aed', color: '#fff', border: 'none',
          padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
        }}>Add allocation</button>
      </div>

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Member', 'Project', 'Allocation %', 'Start', 'End', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocations.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No allocations yet — add one above</td></tr>
            ) : allocations.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827' }}>{a.member_name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{a.project_name}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: a.allocation_percent > 90 ? '#dc2626' : '#7c3aed', fontWeight: '600' }}>{a.allocation_percent}%</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(a.start_date).toLocaleDateString('en-IN')}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(a.end_date).toLocaleDateString('en-IN')}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => remove(a.id)} style={{
                    background: '#fee2e2', color: '#dc2626', border: 'none',
                    padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                  }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}