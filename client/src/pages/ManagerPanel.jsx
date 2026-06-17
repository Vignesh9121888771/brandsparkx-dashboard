import { useEffect, useState } from 'react';
import {
  getProjects, getMembers, getCapacity, getTasks, getRequests,
  updateRequest, createTask, getAISuggestion, getPendingProgressUpdates,
  reviewProgressUpdate, createBulkMembers
} from '../services/api';

const PRIORITY_COLORS = {
  Low: 'var(--green)',
  Medium: 'var(--yellow)',
  High: 'var(--orange)',
  Critical: 'var(--red)'
};

const STATUS_COLORS = {
  Pending: 'var(--yellow)',
  Approved: 'var(--green)',
  Rejected: 'var(--red)'
};

const EMPTY_MEMBER = { name: '', email: '', role: '', region: 'India', skills: '' };

export default function ManagerPanel({ user }) {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [reviewNote, setReviewNote] = useState({});
  const [reviewing, setReviewing] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [taskForm, setTaskForm] = useState({
    title: '', assigned_to: '', project_id: '',
    priority: 'Medium', due_date: '', estimated_hours: '',
    description: ''
  });
  const [bulkMembers, setBulkMembers] = useState([{ ...EMPTY_MEMBER }]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [aiQuery, setAiQuery] = useState({ task_title: '', task_description: '', required_role: '' });
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [reqRes, taskRes, memRes, projRes, capRes, updRes] = await Promise.all([
        getRequests(), getTasks(), getMembers(), getProjects(), getCapacity(), getPendingProgressUpdates()
      ]);

      setRequests(reqRes.data.data || []);
      setTasks(taskRes.data.data || []);
      setMembers(memRes.data.data || []);
      setProjects(projRes.data.data || []);
      setPendingUpdates(updRes.data.data || []);

      const capData = capRes.data.data || [];
      setCapacity(capData);

      const over = capData.filter(m => (parseInt(m.allocated_percent) || 0) > 85);
      const free = capData.filter(m => (parseInt(m.allocated_percent) || 0) < 40);

      const sug = over.map(o => {
        const match = free[0];
        return match
          ? `${o.name} is overloaded (${o.allocated_percent}%) — consider shifting work to ${match.name} (${match.allocated_percent}% allocated)`
          : `${o.name} is over capacity (${o.allocated_percent}%). Consider offloading some tasks.`;
      });
      setSuggestions(sug);
      setLoading(false);
    } catch (err) {
      console.error("Manager panel fetch error:", err);
      setError("Failed to load manager data.");
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleRequest = async (id, status) => {
    try {
      await updateRequest(id, {
        status,
        manager_note: `${status} by manager`
      });
      loadAll();
    } catch (e) {
      console.error(e);
      alert("Failed to update request.");
    }
  };

  const handleReview = async (update_id, action) => {
    try {
      setReviewing(p => ({ ...p, [update_id]: true }));
      await reviewProgressUpdate(update_id, {
        action,
        manager_note: reviewNote[update_id] || ''
      });
      await loadAll();
    } catch (err) {
      console.error('Review error:', err);
      alert(err.response?.data?.message || 'Failed to review update');
    } finally {
      setReviewing(p => ({ ...p, [update_id]: false }));
    }
  };

  const submitTask = async () => {
    if (!taskForm.title || !taskForm.assigned_to) return alert('Title and assignee are required');
    try {
      await createTask(taskForm);
      setTaskForm({
        title: '', assigned_to: '', project_id: '',
        priority: 'Medium', due_date: '', estimated_hours: '',
        description: ''
      });
      loadAll();
      alert('Task assigned successfully');
    } catch (e) {
      console.error(e);
      alert("Failed to assign task.");
    }
  };

  const askAI = async () => {
    if (!aiQuery.task_title) return alert('Enter a task title');
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await getAISuggestion(aiQuery);
      setAiResult(res.data.suggestion);
    } catch (e) {
      console.error(e);
      setAiResult("AI service currently unavailable. Please try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  const addRow    = () => setBulkMembers(b => [...b, { ...EMPTY_MEMBER }]);
  const removeRow = (i) => setBulkMembers(b => b.filter((_,idx) => idx !== i));
  const updateRow = (i, field, val) => setBulkMembers(b => b.map((m,idx) => idx===i ? { ...m, [field]:val } : m));

  const submitBulk = async () => {
    const valid = bulkMembers.filter(m => m.name && m.email && m.role);
    if (!valid.length) return setBulkStatus('error:Fill at least one complete row');
    setBulkStatus('loading');
    try {
      const res = await createBulkMembers({ members: valid });
      setBulkStatus(`success:Added ${res.data.count} member(s) successfully`);
      setBulkMembers([{ ...EMPTY_MEMBER }]);
      loadAll();
    } catch (e) {
      console.error('Bulk add error:', e);
      setBulkStatus(`error:${e.response?.data?.message || 'Failed to add members'}`);
    }
  };

  const exportCSV = () => {
    const rows = [['Name','Email','Role','Region','Allocated %'],...members.map(m => {
      const cap = capacity.find(c => c.id === m.id);
      return [m.name, m.email, m.role, m.region, cap?.allocated_percent || 0];
    })];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'brandsparkx-capacity.csv'; a.click();
  };

  const TABS = [
    ['requests', 'Requests'],
    ['progress', `Progress ${pendingUpdates.length > 0 ? `(${pendingUpdates.length})` : ''}`],
    ['members',  'Add Members'],
    ['assign',   'Assign Task'],
    ['suggest',  'Suggestions'],
    ['ai',       '✨ AI'],
  ];

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '100px' }}>Loading manager panel...</div>;
  if (error) return <div className="page" style={{ textAlign: 'center', padding: '100px', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Manager Control Panel</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Global oversight of requests, task assignments, and AI-assisted resource planning.</p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:'11px' }} onClick={exportCSV}>📊 Export Capacity CSV</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'3px', marginBottom:'16px', background:'var(--bg-card)', padding:'3px', borderRadius:'8px', width:'fit-content', border:'1px solid var(--border)', flexWrap:'wrap' }}>
        {TABS.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'6px 14px', border:'none', borderRadius:'6px',
            fontSize:'11px', fontWeight:'500', cursor:'pointer',
            background: tab===id ? (id==='progress' && pendingUpdates.length > 0 ? 'var(--red)' : 'var(--purple)') : 'transparent',
            color: tab===id ? '#fff' : (id==='progress' && pendingUpdates.length > 0 ? 'var(--red)' : 'var(--text-dim)'),
          }}>{label}</button>
        ))}
      </div>

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:'40px', color:'var(--text-dim)' }}>
              ✅ All clear — no requests found
            </div>
          )}
          {requests.map(r => (
            <div key={r.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{r.title || 'Untitled'} — <span style={{ color: 'var(--purple-light)' }}>{r.type || 'Other'}</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {r.member_name || 'Unknown'} · {r.member_role || 'N/A'} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <span className="badge" style={{
                  background: r.status==='Pending'?'var(--yellow-dim)':r.status==='Approved'?'var(--green-dim)':'var(--red-dim)',
                  color: STATUS_COLORS[r.status] || 'var(--text-dim)'
                }}>{r.status}</span>
              </div>

              {r.description && (
                <div style={{ fontSize:'12px', color:'var(--text-secondary)', padding:'10px', background:'var(--bg-hover)', borderRadius:'8px', marginBottom:'12px' }}>
                  {r.description}
                </div>
              )}

              {r.status === 'Pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)' }} onClick={() => handleRequest(r.id, 'Approved')}>Approve</button>
                  <button className="btn btn-sm" style={{ background: 'var(--red-dim)', color: 'var(--red)' }} onClick={() => handleRequest(r.id, 'Rejected')}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PROGRESS APPROVALS */}
      {tab === 'progress' && (
        <div>
          <div style={{ fontSize:'13px', color:'var(--text-dim)', marginBottom:'16px' }}>
            Review and approve progress updates submitted by team members.
            Only approved updates reflect on the dashboard.
          </div>

          {pendingUpdates.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'40px', color:'var(--text-dim)' }}>
              ✅ No pending progress updates — all caught up!
            </div>
          ) : pendingUpdates.map(u => (
            <div key={u.id} className="card" style={{ marginBottom:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'600', marginBottom:'3px' }}>{u.task_title}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-dim)' }}>
                    {u.project_name} · Submitted by <strong style={{ color:'var(--text-secondary)' }}>{u.member_name}</strong> ({u.member_role})
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>
                    {new Date(u.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <span style={{
                  fontSize:'10px', padding:'4px 10px', borderRadius:'20px',
                  background:'var(--yellow-dim)', color:'var(--yellow)',
                  border:'1px solid rgba(245,158,11,0.3)'
                }}>⏳ Pending Review</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
                <div style={{ padding:'12px', background:'var(--bg-hover)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Current Progress</div>
                  <div style={{ fontSize:'24px', fontWeight:'800', color:'var(--text-secondary)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>{u.current_progress || 0}%</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${u.current_progress || 0}%`, background:'var(--text-dim)' }} />
                  </div>
                </div>
                <div style={{ padding:'12px', background:'var(--purple-dim)', borderRadius:'var(--radius-md)', border:'1px solid rgba(124,58,237,0.3)' }}>
                  <div style={{ fontSize:'10px', color:'var(--purple-light)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Proposed Progress</div>
                  <div style={{ fontSize:'24px', fontWeight:'800', color:'var(--purple-light)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>{u.progress}%</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${u.progress}%`, background:'var(--purple)' }} />
                  </div>
                </div>
              </div>

              <div style={{
                padding:'12px', background:'var(--bg-elevated)',
                borderRadius:'var(--radius-md)', border:'1px solid var(--border-light)',
                marginBottom:'14px'
              }}>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  📝 Work Completed (Member's Report)
                </div>
                <div style={{ fontSize:'13px', color:'var(--text-primary)', lineHeight:1.6, fontStyle:'italic' }}>
                  "{u.note}"
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'4px' }}>
                  Manager Note <span style={{ color:'var(--text-dim)' }}>(optional — shown to member if rejected)</span>
                </div>
                <input
                  className="inp"
                  placeholder="e.g. Good progress! / Please provide screenshots as evidence..."
                  value={reviewNote[u.id] || ''}
                  onChange={e => setReviewNote(p => ({ ...p, [u.id]: e.target.value }))}
                />
              </div>

              <div style={{ display:'flex', gap:'10px' }}>
                <button
                  className="btn btn-success"
                  style={{ flex:1, padding:'10px' }}
                  onClick={() => handleReview(u.id, 'approve')}
                  disabled={reviewing[u.id]}
                >
                  {reviewing[u.id] ? 'Processing...' : '✓ Approve — Apply Progress'}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex:1, padding:'10px' }}
                  onClick={() => handleReview(u.id, 'reject')}
                  disabled={reviewing[u.id]}
                >
                  {reviewing[u.id] ? 'Processing...' : '✗ Reject Update'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BULK ADD MEMBERS */}
      {tab === 'members' && (
        <div>
          <div className="card" style={{ marginBottom:'12px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div className="card-title" style={{ marginBottom:0 }}>Add Team Members</div>
              <button className="btn btn-ghost" style={{ fontSize:'11px' }} onClick={addRow}>+ Add Row</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 2fr 1fr 2fr 28px', gap:'6px', marginBottom:'6px', padding:'0 4px' }}>
              {['Name *','Email *','Role *','Region','Skills',''].map(h => (
                <div key={h} style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'300px', overflowY:'auto' }}>
              {bulkMembers.map((m, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 2fr 2fr 1fr 2fr 28px', gap:'6px', alignItems:'center' }}>
                  <input className="inp" style={{ fontSize:'12px' }} placeholder='Full name' value={m.name}   onChange={e => updateRow(i,'name',e.target.value)} />
                  <input className="inp" style={{ fontSize:'12px' }} placeholder='Email'     value={m.email}  onChange={e => updateRow(i,'email',e.target.value)} />
                  <input className="inp" style={{ fontSize:'12px' }} placeholder='Role'      value={m.role}   onChange={e => updateRow(i,'role',e.target.value)} />
                  <select className="inp" style={{ fontSize:'12px' }} value={m.region} onChange={e => updateRow(i,'region',e.target.value)}>
                    <option>India</option><option>UAE</option>
                  </select>
                  <input className="inp" style={{ fontSize:'12px' }} placeholder='React, Figma...' value={m.skills} onChange={e => updateRow(i,'skills',e.target.value)} />
                  <button onClick={() => removeRow(i)} style={{ background:'var(--red-dim)', border:'1px solid var(--red)', color:'var(--red)', borderRadius:'4px', width:'24px', height:'24px', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
              <button className="btn btn-primary" onClick={submitBulk}>Save {bulkMembers.length} Member{bulkMembers.length>1?'s':''}</button>
              {bulkStatus.startsWith('success') && <div style={{ fontSize:'12px', color:'var(--green)' }}>✓ {bulkStatus.split(':')[1]}</div>}
              {bulkStatus.startsWith('error')   && <div style={{ fontSize:'12px', color:'var(--red)'   }}>✕ {bulkStatus.split(':')[1]}</div>}
              {bulkStatus === 'loading'          && <div className="spinner" />}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Current Members ({members.length})</div>
            <div style={{ maxHeight:'200px', overflowY:'auto' }}>
              {members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                  <div className="avatar" style={{ fontSize:'10px' }}>{m.name.split(' ').map(n=>n[0]).join('')}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'12px', fontWeight:'500' }}>{m.name}</div>
                    <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{m.email}</div>
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{m.role}</div>
                  <span className="badge" style={{ background: m.region==='UAE'?'var(--blue-dim)':'var(--green-dim)', color: m.region==='UAE'?'var(--blue)':'var(--green)' }}>{m.region}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TASK */}
      {tab === 'assign' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Assign New Task</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Title *</div>
                <input className="inp" placeholder='Task title' value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Assign To *</div>
                <select className="inp" value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                  <option value=''>Select employee</option>
                  {members.map(m => {
                    const cap = capacity.find(c => c.id === m.id);
                    const pct = parseInt(cap?.allocated_percent || 0);
                    return <option key={m.id} value={m.id}>{m.name} — {m.role} ({pct}% allocated)</option>;
                  })}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Project</div>
                <select className="inp" value={taskForm.project_id} onChange={e => setTaskForm({ ...taskForm, project_id: e.target.value })}>
                  <option value=''>Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Priority</div>
                  <select className="inp" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Est. Hours</div>
                  <input className="inp" type='number' placeholder='0' value={taskForm.estimated_hours} onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Due Date</div>
                <input className="inp" type='date' value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={submitTask}>Assign Task</button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Current Tasks ({tasks.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
              {tasks.map(t => (
                <div key={t.id} style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.title || 'Untitled'}</div>
                    <span style={{ fontSize: '10px', color: PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Medium, fontWeight: '600' }}>{t.priority || 'Medium'}</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px' }}>{t.assignee_name} · {t.project_name || 'No project'}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'10px', color: t.status==='Completed'?'var(--green)':t.status==='In Progress'?'var(--blue)':'var(--yellow)' }}>{t.status}</span>
                    <span style={{ fontSize:'11px', fontWeight:'700', color:'var(--purple-light)' }}>{t.progress || 0}%</span>
                  </div>
                  <div className="progress-bar" style={{ marginTop:'4px' }}>
                    <div className="progress-fill" style={{
                      width:`${t.progress || 0}%`,
                      background: (t.progress||0) >= 100 ? 'var(--green)' : (t.progress||0) >= 50 ? 'var(--purple)' : 'var(--yellow)'
                    }} />
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No tasks found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUGGESTIONS */}
      {tab === 'suggest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="card">
            <div className="card-title">Allocation Recommendations</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>Auto-generated based on current workload data</div>
            {suggestions.length === 0 && (
              <div style={{ color: 'var(--green)', fontSize: '13px' }}>✅ No overallocation detected — team workload is balanced!</div>
            )}
            {suggestions.map((s, i) => (
              <div key={i} className="alert-banner alert-warning" style={{ marginBottom: '8px' }}>
                💡 {s}
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">Deadline Risk Analysis</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {projects
                .filter(p => p.deadline && p.status !== 'Completed')
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                .map(p => {
                  const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                  const progress = p.progress || 0;
                  const risk = days <= 3 ? 'Critical' : days <= 7 ? 'High' : days <= 14 ? 'Medium' : 'Low';
                  const riskColor = { Critical: 'var(--red)', High: 'var(--yellow)', Medium: 'var(--blue)', Low: 'var(--green)' };
                  const canComplete = !(days <= 7 && progress < 50);
                  return (
                    <div key={p.id} style={{ padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px', border: `1px solid ${!canComplete ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{p.name || 'Untitled'}</div>
                        <span className="badge" style={{ background: (riskColor[risk] || 'var(--text-dim)') + '22', color: riskColor[risk] || 'var(--text-dim)' }}>{risk}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>{days}d left · {progress}% done · {p.client || 'Unknown Client'}</div>
                      <div className="progress-bar" style={{ marginBottom: '6px' }}>
                        <div className="progress-fill" style={{ width: `${progress}%`, background: progress >= 75 ? 'var(--green)' : progress >= 40 ? 'var(--yellow)' : 'var(--red)' }} />
                      </div>
                      {!canComplete && (
                        <div style={{ fontSize: '11px', color: 'var(--red)' }}>
                          ⚠️ At current pace, this project may not complete by deadline.
                        </div>
                      )}
                    </div>
                  );
                })}
              {projects.filter(p => p.deadline && p.status !== 'Completed').length === 0 && (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No projects with active deadlines</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI */}
      {tab === 'ai' && (
        <div className="grid-2">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span>✨</span>
              <div className="card-title" style={{ marginBottom: 0 }}>AI Assignment Suggestion</div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>Powered by Google Gemini</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Task Title *</div>
                <input className="inp" placeholder='What needs to be assigned?' value={aiQuery.task_title} onChange={e => setAiQuery({ ...aiQuery, task_title: e.target.value })} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Description</div>
                <textarea className="inp" style={{ height: '70px', resize: 'none' }} placeholder='Describe the task...' value={aiQuery.task_description} onChange={e => setAiQuery({ ...aiQuery, task_description: e.target.value })} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Required Role</div>
                <input className="inp" placeholder='e.g. Frontend Developer' value={aiQuery.required_role} onChange={e => setAiQuery({ ...aiQuery, required_role: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={askAI} disabled={aiLoading} style={{ background: 'linear-gradient(135deg,var(--purple),#4f46e5)', opacity: aiLoading ? 0.7 : 1 }}>
                {aiLoading ? 'Thinking...' : '✨ Get Suggestion'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">AI Response</div>
            {aiLoading && <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-dim)', fontSize: '12px' }}><div className="spinner" />Analyzing team data...</div>}
            {aiResult && !aiLoading && <div style={{ fontSize: '12px', lineHeight: '1.7', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', whiteSpace: 'pre-wrap' }}>{aiResult}</div>}
            {!aiResult && !aiLoading && <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '30px' }}>Fill in the task details and click "Get Suggestion"</div>}
          </div>
        </div>
      )}
    </div>
  );
}
