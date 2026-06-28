import { useEffect, useState, useCallback } from 'react';
import { getProjects, getMembers, createProject, updateProject, deleteProject } from '../services/api';

const Card = ({ children, style={} }) => (
  <div className="card" style={{ padding:'20px', ...style }}>{children}</div>
);

const STATUS_OPTIONS = ['Active', 'On Hold', 'Completed', 'Cancelled', 'Planning', 'In Review'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const statusColors = {
  Active:      { color: 'var(--green)',        bg: 'var(--green-dim)'  },
  'In Review': { color: 'var(--yellow)',       bg: 'var(--yellow-dim)' },
  Planning:    { color: 'var(--purple-light)', bg: 'var(--purple-dim)' },
  Completed:   { color: 'var(--text-dim)',     bg: 'var(--bg-hover)'   },
  'On Hold':   { color: 'var(--orange)',       bg: 'var(--orange-dim)' },
  Cancelled:   { color: 'var(--red)',          bg: 'var(--red-dim)'    },
};

export default function Projects({ user, search }) {
  const [projects, setProjects] = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '', client: '', status: 'Planning', priority: 'Medium', deadline: '', manager_id: user?.member_id || '', region: 'India', description: ''
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, mRes] = await Promise.all([getProjects(), getMembers()]);
      setProjects(pRes.data.data || []);
      setMembers(mRes.data.data   || []);
    } catch {
      console.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.client) return alert('Project name and client are required');
    try {
      if (editing) {
        await updateProject(editing, form);
      } else {
        await createProject(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', client: '', status: 'Planning', priority: 'Medium', deadline: '', manager_id: user?.member_id || '', region: 'India', description: '' });
      load();
    } catch {
      alert('Failed to save project');
    }
  };

  const handleEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name, client: p.client, status: p.status, priority: p.priority,
      deadline: p.deadline ? p.deadline.split('T')[0] : '',
      manager_id: p.manager_id, region: p.region, description: p.description || ''
    });
    setShowForm(true);
  };

  const handleDeliver = async (p) => {
    if (!window.confirm(`Mark "${p.name}" as Completed/Delivered?`)) return;
    try {
      await updateProject(p.id, { ...p, status: 'Completed', progress: 100 });
      load();
    } catch {
      alert('Failed to update project status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      load();
    } catch { alert('Failed to delete'); }
  };

  const isManager = user?.role === 'manager';

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.client?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-state">Loading portfolio...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Project Portfolio</h1>
          <p>Management and tracking of all client engagements.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', client: '', status: 'Planning', priority: 'Medium', deadline: '', manager_id: user?.member_id || '', region: 'India', description: '' }); }}>+ New Project</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ maxWidth:'600px', width:'100%', padding:'30px' }}>
            <h3>{editing ? 'Edit Project' : 'Create New Project'}</h3>
            <div className="grid-2" style={{ marginTop:'20px' }}>
              <div className="form-group">
                <label>Project Name</label>
                <input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Website Redesign" />
              </div>
              <div className="form-group">
                <label>Client</label>
                <input value={form.client} onChange={e => setForm({...form, client:e.target.value})} placeholder="Client name" />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline:e.target.value})} />
              </div>
              <div className="form-group">
                <label>Region</label>
                <select value={form.region} onChange={e => setForm({...form, region:e.target.value})}>
                  <option value="India">India</option>
                  <option value="UAE">UAE</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Project Manager</label>
              <select value={form.manager_id} onChange={e => setForm({...form, manager_id:e.target.value})}>
                <option value="">Select Manager</option>
                {members.filter(m => m.role === 'Manager' || m.role === 'Admin' || m.role === 'Lead').map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
               <label>Description</label>
               <textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} style={{ height:'80px' }} placeholder="Project goals..." />
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex:1 }} onClick={handleSave}>Save Project</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-3">
        {filtered.map(p => (
          <Card key={p.id}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <span className="badge" style={{
                background: statusColors[p.status]?.bg || 'var(--bg-hover)',
                color: statusColors[p.status]?.color || 'var(--text-dim)'
              }}>{p.status}</span>
              <div style={{ display:'flex', gap:'8px' }}>
                {isManager && p.status !== 'Completed' && (
                  <button onClick={() => handleDeliver(p)} title="Deliver Project" style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px' }}>📦</button>
                )}
                <button onClick={() => handleEdit(p)} title="Edit" style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px' }}>✏️</button>
                <button onClick={() => handleDelete(p.id)} title="Delete" style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px' }}>🗑️</button>
              </div>
            </div>

            <h3 style={{ marginTop:'12px', fontSize:'16px' }}>{p.name}</h3>
            <div style={{ fontSize:'12px', color:'var(--text-dim)', marginBottom:'16px' }}>Client: {p.client}</div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'16px', borderTop:'1px solid var(--border)' }}>
               <div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase' }}>Deadline</div>
                  <div style={{ fontSize:'12px', fontWeight:'600' }}>{p.deadline ? new Date(p.deadline).toLocaleDateString() : 'No date'}</div>
               </div>
               <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase' }}>Priority</div>
                  <div style={{ fontSize:'12px', fontWeight:'700', color: p.priority==='High'||p.priority==='Critical' ? 'var(--red)' : 'var(--text-primary)' }}>{p.priority}</div>
               </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty-state">No projects found.</div>}
    </div>
  );
}
