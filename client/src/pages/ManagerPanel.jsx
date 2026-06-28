import { useEffect, useState, useCallback } from 'react';
import { 
  getProjects, getMembers, getCapacity, getRequests,
  updateRequest, createTask, getAISuggestion, getPendingProgressUpdates,
  reviewProgressUpdate, createBulkMembers
} from '../services/api';

const EMPTY_MEMBER    = { name:'', email:'', role:'', region:'India', skills:'' };

// ── Star Rating Component ───────────────────────────────────────
const StarRating = ({ value, onChange }) => (
  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
    {[1,2,3,4,5].map(star => (
      <button key={star} onClick={() => onChange(star)} style={{
        background:'none', border:'none', cursor:'pointer',
        fontSize:'24px', padding:'2px',
        color: star <= value ? '#f59e0b' : 'var(--border-light)',
        transition:'color 0.15s, transform 0.1s',
        transform: star <= value ? 'scale(1.1)' : 'scale(1)',
      }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.2)'}
        onMouseLeave={e => e.currentTarget.style.transform=star<=value?'scale(1.1)':'scale(1)'}
      >★</button>
    ))}
    <span style={{ fontSize:'12px', color:'var(--text-dim)', marginLeft:'4px' }}>
      {value === 1 ? 'Poor' : value === 2 ? 'Fair' : value === 3 ? 'Good' : value === 4 ? 'Great' : value === 5 ? 'Excellent' : 'Select rating'}
    </span>
  </div>
);

export default function ManagerPanel() {
  const [tab,            setTab]            = useState('requests');
  const [requests,       setRequests]       = useState([]);
  const [members,        setMembers]        = useState([]);
  const [projects,       setProjects]       = useState([]);
  const [capacity,       setCapacity]       = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [reviewNote,     setReviewNote]     = useState({});
  const [qualityScore,   setQualityScore]   = useState({});
  const [reviewing,      setReviewing]      = useState({});
  const [suggestions,    setSuggestions]    = useState([]);
  const [taskForm,       setTaskForm]       = useState({ title:'', assigned_to:'', project_id:'', priority:'Medium', due_date:'', estimated_hours:'', description:'' });
  const [bulkMembers,    setBulkMembers]    = useState([{ ...EMPTY_MEMBER }]);
  const [bulkStatus,     setBulkStatus]     = useState('');
  const [aiQuery,        setAiQuery]        = useState({ task_title:'', task_description:'', required_role:'' });
  const [aiResult,       setAiResult]       = useState('');
  const [aiLoading,      setAiLoading]      = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [approvalResult, setApprovalResult] = useState({});

  const loadAll = useCallback(async () => {
    try {
      const [reqRes, memRes, projRes, capRes, updRes] = await Promise.all([
        getRequests(), getMembers(), getProjects(), getCapacity(), getPendingProgressUpdates()
      ]);
      setRequests(reqRes.data.data       || []);
      setMembers(memRes.data.data        || []);
      setProjects(projRes.data.data      || []);
      setPendingUpdates(updRes.data.data || []);
      const capData = capRes.data.data   || [];
      setCapacity(capData);

      const over = capData.filter(m => (parseInt(m.allocated_percent)||0) > 85);
      const free = capData.filter(m => (parseInt(m.allocated_percent)||0) < 40);
      setSuggestions(over.map(o => {
        const match = free[0];
        return match
          ? `${o.name} is overloaded (${o.allocated_percent}%) — consider shifting work to ${match.name} (${match.allocated_percent}% allocated)`
          : `${o.name} is over capacity (${o.allocated_percent}%). Consider offloading tasks.`;
      }));
    } catch (err) {
      console.error('Manager panel fetch error:', err);
      setError('Failed to load manager data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRequest = async (id, status) => {
    try {
      await updateRequest(id, { status, manager_note:`${status} by manager` });
      loadAll();
    } catch { alert('Failed to update request.'); }
  };

  const handleReview = async (update_id, action) => {
    if (action === 'approve' && !qualityScore[update_id]) {
      alert('Please rate the quality of work (1-5 stars) before approving');
      return;
    }
    try {
      setReviewing(p => ({ ...p, [update_id]: true }));
      const res = await reviewProgressUpdate(update_id, {
        action,
        manager_note:  reviewNote[update_id] || '',
        quality_score: action === 'approve' ? qualityScore[update_id] : null,
      });
      if (res.data.data) {
        setApprovalResult(p => ({ ...p, [update_id]: res.data.data }));
      }
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Review failed');
    } finally {
      setReviewing(p => ({ ...p, [update_id]: false }));
    }
  };

  const handleTaskCreate = async (e) => {
    e.preventDefault();
    try {
      await createTask(taskForm);
      setTaskForm({ title:'', assigned_to:'', project_id:'', priority:'Medium', due_date:'', estimated_hours:'', description:'' });
      alert('Task assigned successfully!');
      loadAll();
    } catch { alert('Failed to create task.'); }
  };

  const handleAiSuggest = async () => {
    if (!aiQuery.task_title || !aiQuery.required_role) return alert('Task title and role are required');
    setAiLoading(true);
    try {
      const res = await getAISuggestion({ ...aiQuery, members_context: capacity });
      setAiResult(res.data.data);
    } catch { setAiResult('Failed to get AI recommendation.'); }
    setAiLoading(false);
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
      setBulkStatus(`success:Added ${res.data.count || res.data.data?.length || valid.length} member(s) successfully`);
      setBulkMembers([{ ...EMPTY_MEMBER }]);
      loadAll();
    } catch (err) {
      setBulkStatus(`error:${err.response?.data?.message || 'Failed to process bulk onboarding'}`);
    }
  };

  if (loading) return <div className="loading-state">Accessing management console...</div>;
  if (error)   return <div className="error-state">{error}</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom:'24px' }}>
        <div>
          <h1>Managerial Control Panel</h1>
          <p>System-wide task assignment, resource redistribution, and AI insights.</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
           <div className="badge badge-purple" style={{ textTransform:'none' }}>🛡️ High Clearance Access</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:'24px' }}>
        <button className={`tab-btn ${tab==='requests'?'active':''}`} onClick={()=>setTab('requests')}>
          Inbox {pendingUpdates.length > 0 && <span className="badge badge-red">{pendingUpdates.length}</span>}
        </button>
        <button className={`tab-btn ${tab==='assign'?'active':''}`} onClick={()=>setTab('assign')}>Assign Tasks</button>
        <button className={`tab-btn ${tab==='onboarding'?'active':''}`} onClick={()=>setTab('onboarding')}>Onboarding</button>
        <button className={`tab-btn ${tab==='ai'?'active':''}`} onClick={()=>setTab('ai')}>AI Insights ✦</button>
      </div>

      {/* ── Tab: Inbox (Progress Updates) ────────────────────────── */}
      {tab === 'requests' && (
        <div className="grid-1">
          {pendingUpdates.length === 0 && (
            <div className="card" style={{ padding:'60px 20px', textAlign:'center' }}>
               <div style={{ fontSize:'32px', marginBottom:'16px' }}>📬</div>
               <h3 style={{ marginBottom:'8px' }}>Your inbox is empty</h3>
               <p style={{ color:'var(--text-dim)', fontSize:'13px' }}>All pending progress updates have been reviewed.</p>
            </div>
          )}

          {pendingUpdates.map(u => (
            <div key={u.id} className="card" style={{ padding:'0', overflow:'hidden', marginBottom:'16px' }}>
              <div style={{ padding:'20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.01)' }}>
                 <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                    <div className="avatar">{u.member_name?.[0]}</div>
                    <div>
                       <div style={{ fontSize:'14px', fontWeight:'700' }}>{u.member_name} <span style={{ fontWeight:'400', color:'var(--text-dim)', margin:'0 4px' }}>→</span> {u.task_title}</div>
                       <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'2px' }}>{u.member_role} · {u.project_name || 'General'}</div>
                    </div>
                 </div>
                 <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'18px', fontWeight:'800', color:'var(--purple-light)', fontFamily:'var(--font-mono)' }}>{u.current_progress}% <span style={{ fontSize:'12px', fontWeight:'400', color:'var(--text-dim)' }}>→</span> {u.progress}%</div>
                    <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>Proposed Progress Update</div>
                 </div>
              </div>

              <div style={{ padding:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px' }}>
                 <div>
                    <div style={{ fontSize:'11px', fontWeight:'600', color:'var(--text-dim)', textTransform:'uppercase', marginBottom:'8px' }}>Submission Note</div>
                    <div style={{ fontSize:'13px', lineHeight:'1.5', padding:'12px', background:'var(--bg-hover)', borderRadius:'8px', border:'1px solid var(--border)' }}>
                      {u.note}
                    </div>
                    {u.is_overtime && (
                      <div style={{ marginTop:'10px', display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 10px', borderRadius:'20px', background:'var(--yellow-dim)', color:'var(--yellow)', fontSize:'11px', fontWeight:'700' }}>
                        ⏰ Overtime Submission (Bonus Eligible)
                      </div>
                    )}
                 </div>

                 <div>
                    <div style={{ fontSize:'11px', fontWeight:'600', color:'var(--text-dim)', textTransform:'uppercase', marginBottom:'8px' }}>Manager Review</div>
                    <textarea
                      placeholder="Add a comment for the team member..."
                      value={reviewNote[u.id] || ''}
                      onChange={e => setReviewNote(p => ({...p, [u.id]: e.target.value}))}
                      style={{ width:'100%', padding:'10px', borderRadius:'8px', background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:'12px', height:'60px', resize:'none', marginBottom:'12px' }}
                    />

                    <div style={{ marginBottom:'20px' }}>
                      <div style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'6px' }}>Quality of Work</div>
                      <StarRating value={qualityScore[u.id]} onChange={val => setQualityScore(p => ({...p, [u.id]:val}))} />
                    </div>

                    <div style={{ display:'flex', gap:'10px' }}>
                       <button className="btn-secondary" style={{ flex:1, color:'var(--red)' }} disabled={reviewing[u.id]} onClick={()=>handleReview(u.id, 'reject')}>Reject</button>
                       <button className="btn-primary" style={{ flex:2 }} disabled={reviewing[u.id]} onClick={()=>handleReview(u.id, 'approve')}>
                          {reviewing[u.id] ? 'Reviewing...' : 'Approve & Update'}
                       </button>
                    </div>

                    {approvalResult[u.id] && (
                      <div style={{ marginTop:'12px', padding:'10px', borderRadius:'8px', background:'var(--green-dim)', border:'1px solid var(--green)', color:'var(--green)', fontSize:'11px' }}>
                        ✅ Approved! Employee earned <b>+{approvalResult[u.id].incentive_points_earned} points</b>. Productivity: <b>{approvalResult[u.id].productivity_score}%</b>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          ))}

          {/* Legacy Request Inbox */}
          <div style={{ marginTop:'30px' }}>
            <h3 style={{ fontSize:'14px', marginBottom:'16px', color:'var(--text-dim)' }}>Leave & Resource Requests</h3>
            {requests.filter(r => r.status === 'Pending').map(r => (
              <div key={r.id} className="card" style={{ padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                 <div>
                    <div style={{ fontSize:'13px', fontWeight:'600' }}>{r.member_name} <span style={{ fontWeight:'400', color:'var(--text-dim)' }}>requested</span> {r.type}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{r.title} · {new Date(r.start_date).toLocaleDateString()}</div>
                 </div>
                 <div style={{ display:'flex', gap:'8px' }}>
                    <button className="btn-secondary" style={{ padding:'5px 12px', fontSize:'11px' }} onClick={()=>handleRequest(r.id, 'Rejected')}>Reject</button>
                    <button className="btn-primary"   style={{ padding:'5px 12px', fontSize:'11px' }} onClick={()=>handleRequest(r.id, 'Approved')}>Approve</button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Task Assignment ─────────────────────────────────── */}
      {tab === 'assign' && (
        <div className="grid-2-1" style={{ gap:'24px' }}>
          <div className="card" style={{ padding:'24px' }}>
            <h3 style={{ marginBottom:'20px' }}>New Task Assignment</h3>
            <form onSubmit={handleTaskCreate}>
               <div className="form-group">
                 <label>Task Title</label>
                 <input type="text" required placeholder="e.g., Q3 UI Refresh" value={taskForm.title} onChange={e=>setTaskForm({...taskForm, title:e.target.value})} />
               </div>

               <div className="grid-2">
                 <div className="form-group">
                   <label>Assignee</label>
                   <select required value={taskForm.assigned_to} onChange={e=>setTaskForm({...taskForm, assigned_to:e.target.value})}>
                     <option value="">Select Member</option>
                     {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.region})</option>)}
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Project</label>
                   <select required value={taskForm.project_id} onChange={e=>setTaskForm({...taskForm, project_id:e.target.value})}>
                     <option value="">Select Project</option>
                     {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                 </div>
               </div>

               <div className="grid-3">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm, priority:e.target.value})}>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" required value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm, due_date:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Est. Hours</label>
                    <input type="number" placeholder="0" value={taskForm.estimated_hours} onChange={e=>setTaskForm({...taskForm, estimated_hours:e.target.value})} />
                  </div>
               </div>

               <div className="form-group">
                 <label>Description</label>
                 <textarea placeholder="Detailed task brief..." value={taskForm.description} onChange={e=>setTaskForm({...taskForm, description:e.target.value})} style={{ height:'100px' }} />
               </div>

               <button type="submit" className="btn-primary" style={{ width:'100%', marginTop:'10px' }}>Confirm Assignment</button>
            </form>
          </div>

          <div className="card" style={{ padding:'24px' }}>
             <h3 style={{ marginBottom:'16px' }}>Redistribution Hub</h3>
             <div style={{ padding:'12px', background:'var(--blue-dim)', border:'1px solid var(--blue)', borderRadius:'8px', marginBottom:'20px' }}>
                <div style={{ fontSize:'11px', color:'var(--blue)', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em' }}>Smart Alert</div>
                <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'4px' }}>System detects workload imbalances. Consider re-assigning tasks.</div>
             </div>

             <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {suggestions.map((s,i) => (
                  <div key={i} style={{ padding:'12px', background:'var(--bg-hover)', borderRadius:'8px', border:'1px solid var(--border)', fontSize:'12px', lineHeight:'1.4' }}>
                     ✨ {s}
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* ── Tab: Onboarding ────────────────────────────────────────── */}
      {tab === 'onboarding' && (
        <div className="card" style={{ padding:'24px' }}>
           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
              <div>
                <h3>Bulk Employee Onboarding</h3>
                <p style={{ color:'var(--text-dim)', fontSize:'12px', marginTop:'4px' }}>Register multiple team members at once.</p>
              </div>
              <button className="btn-secondary" onClick={addRow}>+ Add Row</button>
           </div>

           <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'800px' }}>
                 <thead>
                    <tr style={{ textAlign:'left', borderBottom:'1px solid var(--border)' }}>
                       <th style={{ padding:'12px', fontSize:'11px', color:'var(--text-dim)' }}>NAME</th>
                       <th style={{ padding:'12px', fontSize:'11px', color:'var(--text-dim)' }}>EMAIL</th>
                       <th style={{ padding:'12px', fontSize:'11px', color:'var(--text-dim)' }}>ROLE</th>
                       <th style={{ padding:'12px', fontSize:'11px', color:'var(--text-dim)' }}>REGION</th>
                       <th style={{ padding:'12px', fontSize:'11px', color:'var(--text-dim)' }}>SKILLS</th>
                       <th style={{ padding:'12px' }}></th>
                    </tr>
                 </thead>
                 <tbody>
                    {bulkMembers.map((m, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border-light)' }}>
                         <td style={{ padding:'10px' }}><input style={{ background:'transparent', border:'none', color:'var(--text-primary)', fontSize:'13px', width:'100%' }} value={m.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="Full name" /></td>
                         <td style={{ padding:'10px' }}><input style={{ background:'transparent', border:'none', color:'var(--text-primary)', fontSize:'13px', width:'100%' }} value={m.email} onChange={e => updateRow(i, 'email', e.target.value)} placeholder="Email" /></td>
                         <td style={{ padding:'10px' }}><input style={{ background:'transparent', border:'none', color:'var(--text-primary)', fontSize:'13px', width:'100%' }} value={m.role} onChange={e => updateRow(i, 'role', e.target.value)} placeholder="e.g. Designer" /></td>
                         <td style={{ padding:'10px' }}>
                            <select value={m.region} onChange={e => updateRow(i, 'region', e.target.value)} style={{ background:'transparent', border:'none', color:'var(--text-primary)', fontSize:'13px' }}>
                               <option value="India">India</option>
                               <option value="UAE">UAE</option>
                            </select>
                         </td>
                         <td style={{ padding:'10px' }}><input style={{ background:'transparent', border:'none', color:'var(--text-primary)', fontSize:'13px', width:'100%' }} value={m.skills} onChange={e => updateRow(i, 'skills', e.target.value)} placeholder="e.g. React, Figma" /></td>
                         <td style={{ padding:'10px' }}>{bulkMembers.length > 1 && <button onClick={()=>removeRow(i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer' }}>✕</button>}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div style={{ marginTop:'24px', display:'flex', justifyContent:'flex-end', gap:'12px', alignItems:'center' }}>
              {bulkStatus.startsWith('success') && <span style={{ color:'var(--green)', fontSize:'12px' }}>✓ {bulkStatus.split(':')[1]}</span>}
              {bulkStatus.startsWith('error') && <span style={{ color:'var(--red)', fontSize:'12px' }}>✕ {bulkStatus.split(':')[1]}</span>}
              <button className="btn-primary" disabled={bulkStatus === 'loading'} onClick={submitBulk}>
                 {bulkStatus === 'loading' ? 'Processing...' : `Save ${bulkMembers.length} Member${bulkMembers.length>1?'s':''}`}
              </button>
           </div>
        </div>
      )}

      {/* ── Tab: AI Insights ────────────────────────────────────────── */}
      {tab === 'ai' && (
        <div className="grid-2-1" style={{ gap:'24px' }}>
          <div className="card" style={{ padding:'24px' }}>
             <h3>Smart Resource Recommendation</h3>
             <p style={{ color:'var(--text-dim)', fontSize:'12px', marginTop:'4px', marginBottom:'24px' }}>AI analyzes skill sets, current workload, and regional proximity.</p>

             <div className="form-group">
                <label>Proposed Task Title</label>
                <input type="text" placeholder="e.g. App Prototype" value={aiQuery.task_title} onChange={e=>setAiQuery({...aiQuery, task_title:e.target.value})} />
             </div>
             <div className="form-group">
                <label>Required Skill/Role</label>
                <input type="text" placeholder="e.g. UI Designer" value={aiQuery.required_role} onChange={e=>setAiQuery({...aiQuery, required_role:e.target.value})} />
             </div>
             <div className="form-group">
                <label>Contextual Details (Optional)</label>
                <textarea placeholder="Specific requirements..." value={aiQuery.task_description} onChange={e=>setAiQuery({...aiQuery, task_description:e.target.value})} style={{ height:'80px' }} />
             </div>

             <button className="btn-primary" onClick={handleAiSuggest} disabled={aiLoading} style={{ width:'100%', marginTop:'10px', background:'var(--purple-glow)', color:'white' }}>
                {aiLoading ? 'AI is processing...' : 'Get Recommendation'}
             </button>
          </div>

          <div className="card" style={{ padding:'24px', background:'var(--bg-elevated)', border:'1px solid var(--purple-dim)' }}>
             <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'16px' }}>
                <span style={{ fontSize:'20px' }}>✦</span>
                <h3 style={{ fontSize:'16px' }}>AI Evaluation</h3>
             </div>

             <div style={{ minHeight:'200px', fontSize:'13px', lineHeight:'1.6', color:'var(--text-secondary)', whiteSpace:'pre-wrap' }}>
                {aiResult || "Fill in the task details and click 'Get Recommendation' to see AI insights here."}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
