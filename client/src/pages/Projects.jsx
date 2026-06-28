import { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../services/api';

const statusColors = {
  Active:      { color: 'var(--green)',        bg: 'var(--green-dim)'  },
  'In Review': { color: 'var(--yellow)',       bg: 'var(--yellow-dim)' },
  Planning:    { color: 'var(--purple-light)', bg: 'var(--purple-dim)' },
  Completed:   { color: 'var(--text-dim)',     bg: 'var(--bg-hover)'   },
};

const EMPTY_FORM = { name: '', client: '', status: 'Planning', region: 'India', deadline: '', description: '', budget: '' };

export default function Projects({ role, search, defaultRegion }) {
  const [projects,   setProjects]   = useState([]);
  const [filter,     setFilter]     = useState('All');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [editId,     setEditId]     = useState(null);

  const load = () => {
    setLoading(true);
    getProjects()
      .then(r => { setProjects(r.data.data || []); setLoading(false); })
      .catch(() => { setError('Failed to load projects.'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.client) return alert('Project name and client are required');
    try {
      setSaving(true);
      if (editId) {
        await updateProject(editId, form);
      } else {
        await createProject(form);
      }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setForm({
      name: p.name || '',
      client: p.client || '',
      status: p.status || 'Planning',
      region: p.region || 'India',
      deadline: p.deadline ? p.deadline.split('T')[0] : '',
      description: p.description || '',
      budget: p.budget || '',
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      load();
    } catch {
      alert('Failed to delete project');
    }
  };

  const statuses = ['All', 'Active', 'In Review', 'Planning', 'Completed'];

  const filtered = projects.filter(p => {
    const matchFilter = filter === 'All' || p.status === filter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '100px' }}>Loading projects...</div>;
  if (error)   return <div className="page" style={{ textAlign: 'center', padding: '100px', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Projects Portfolio</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Active engagements and resource utilization.</p>
        </div>
        {role === 'manager' && (
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }}>
            + Add Project
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>{editId ? 'Edit Project' : 'New Project'}</div>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Project Name *</div>
              <input className="inp" placeholder="e.g. Brand Identity Kit" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Client *</div>
              <input className="inp" placeholder="e.g. Mumbai Client" value={form.client}
                onChange={e => setForm(p => ({ ...p, client: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Status</div>
              <select className="inp" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option>Planning</option>
                <option>Active</option>
                <option>In Review</option>
                <option>Completed</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Region</div>
              <select className="inp" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}>
                <option>India</option>
                <option>UAE</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Deadline</div>
              <input className="inp" type="date" value={form.deadline}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Budget</div>
              <input className="inp" type="number" placeholder="e.g. 50000" value={form.budget}
                onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Description</div>
              <textarea className="inp" rows={2} placeholder="Project description..." value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Project' : 'Create Project'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: '20px', border: '1px solid',
            fontSize: '12px', fontWeight: '500', cursor: 'pointer',
            borderColor: filter === s ? 'var(--purple)' : 'var(--border)',
            background:  filter === s ? 'var(--purple-dim)' : 'transparent',
            color:       filter === s ? 'var(--purple-light)' : 'var(--text-dim)',
          }}>{s}</button>
        ))}
      </div>

      {/* Project cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {filtered.map(p => {
          const sc   = statusColors[p.status] || statusColors.Planning;
          const days = p.deadline
            ? Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
          const urgent   = days !== null && days <= 7;
          const progress = p.progress ?? (
            p.status === 'Completed' ? 100 :
            p.status === 'Active'    ? 65  :
            p.status === 'In Review' ? 85  : 15
          );

          return (
            <div key={p.id} className="card project-card" style={{ padding: '20px', transition: 'var(--transition)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Status + Region */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontWeight: '600' }}>
                  {(p.status || 'Planning').toUpperCase()}
                </span>
                <span style={{
                  fontSize: '10px', padding: '3px 10px', borderRadius: '20px',
                  background: p.region === 'UAE' ? 'var(--blue-dim)' : 'var(--green-dim)',
                  color:      p.region === 'UAE' ? 'var(--blue)'     : 'var(--green)', fontWeight: '500'
                }}>{p.region || 'All'}</span>
              </div>

              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{p.name || 'Untitled Project'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>{p.client || 'No Client'}</div>

              {/* Progress */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Progress</span>
                  <span style={{ fontSize: '11px', color: sc.color, fontWeight: '600' }}>{progress}%</span>
                </div>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: sc.color, borderRadius: '2px' }} />
                </div>
              </div>

              {/* Deadline */}
              {days !== null && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${urgent ? 'var(--red)' : 'var(--border)'}`,
                  marginBottom: role === 'manager' ? '12px' : '0'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Deadline</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: urgent ? 'var(--red)' : 'var(--text-secondary)' }}>
                    {new Date(p.deadline).toLocaleDateString('en-IN')}
                    {urgent && ' ⚠️'}
                  </span>
                </div>
              )}

              {/* Manager actions */}
              {role === 'manager' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: '11px', padding: '5px' }}
                    onClick={() => handleEdit(p)}>✏ Edit</button>
                  <button className="btn btn-danger" style={{ flex: 1, fontSize: '11px', padding: '5px' }}
                    onClick={() => handleDelete(p.id)}>🗑 Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No projects found.</div>
      )}
    </div>
  );
}