import { useState, useEffect, useCallback } from 'react';
import {
  getRequests, createRequest, updateRequest, getMembers,
  getTasks, submitTaskProgress, getTaskComments, createTaskComment
} from '../services/api';

const CommentSection = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const res = await getTaskComments(taskId);
      setComments(res.data.data || []);
    } catch (e) { console.error(e); }
  }, [taskId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await createTaskComment(taskId, { content: newComment });
      setNewComment('');
      loadComments();
    } catch (e) { alert('Failed to post comment'); }
    setLoading(false);
  };

  return (
    <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid var(--border-light)' }}>
       <div style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-dim)', textTransform:'uppercase', marginBottom:'12px' }}>Discussion</div>
       <div style={{ display:'flex', flexDirection:'column', gap:'10px', maxHeight:'150px', overflowY:'auto', marginBottom:'12px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ fontSize:'12px', background:'var(--bg-hover)', padding:'8px 10px', borderRadius:'8px' }}>
               <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontWeight:'600', color:'var(--purple-light)' }}>{c.user_name}</span>
                  <span style={{ fontSize:'10px', color:'var(--text-dim)' }}>{new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
               </div>
               <div style={{ color:'var(--text-secondary)' }}>{c.content}</div>
            </div>
          ))}
          {comments.length === 0 && <div style={{ fontSize:'11px', color:'var(--text-dim)', textAlign:'center' }}>No comments yet.</div>}
       </div>
       <form onSubmit={handleSubmit} style={{ display:'flex', gap:'6px' }}>
          <input
            className="inp"
            placeholder="Write a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            style={{ height:'32px', fontSize:'11px' }}
          />
          <button className="btn btn-primary" style={{ padding:'0 12px', height:'32px' }} disabled={loading}>Send</button>
       </form>
    </div>
  );
};

export default function Requests({ role, user, search }) {
  const [requests,  setRequests]  = useState([]);
  const [members,   setMembers]   = useState([]);
  const [myTasks,   setMyTasks]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState(role === 'manager' ? 'requests' : 'mytasks');

  // Progress update state
  const [progressForm, setProgressForm] = useState({});
  const [progressNote, setProgressNote] = useState({});
  const [submitting,   setSubmitting]   = useState({});
  const [setSuccessMsg]   = useState({});
  const [setErrorMsg]     = useState({});

  // New request form
  const [form, setForm] = useState({
    member_id: '', type: 'Leave', title: '', description: '', start_date: '', end_date: ''
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, memRes, taskRes] = await Promise.all([
        getRequests(), getMembers(), getTasks()
      ]);
      setRequests(reqRes.data.data || []);
      setMembers(memRes.data.data || []);

      // Filter tasks for current member
      if (role === 'employee' && user?.member_id) {
        const mine = (taskRes.data.data || []).filter(t => t.assigned_to === user.member_id);
        setMyTasks(mine);
      } else {
        setMyTasks(taskRes.data.data || []);
      }
    } catch {
      console.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [role, user?.member_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateProgress = async (task) => {
    const prog = progressForm[task.id];
    const note = progressNote[task.id];

    if (prog === undefined) return alert('Select progress percentage');
    if (!note || note.trim().length < 5) return alert('Please provide a short note about your progress');

    try {
      setSubmitting(prev => ({ ...prev, [task.id]: true }));
      setErrorMsg(prev => ({ ...prev, [task.id]: null }));

      await submitTaskProgress(task.id, {
        progress: parseInt(prog),
        note: note.trim(),
        member_id: user.member_id
      });

      setSuccessMsg(prev => ({ ...prev, [task.id]: 'Update submitted for approval!' }));
      setTimeout(() => {
        setSuccessMsg(prev => ({ ...prev, [task.id]: null }));
        setProgressNote(prev => ({ ...prev, [task.id]: '' }));
      }, 3000);

    } catch (err) {
      setErrorMsg(prev => ({ ...prev, [task.id]: err.response?.data?.message || 'Submission failed' }));
    } finally {
      setSubmitting(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (role === 'employee' && !user?.member_id) return alert('No member profile found');

    try {
      setSubmittingReq(true);
      const payload = {
        ...form,
        member_id: role === 'manager' ? form.member_id : user.member_id
      };
      await createRequest(payload);
      setForm({ member_id: '', type: 'Leave', title: '', description: '', start_date: '', end_date: '' });
      loadData();
      alert('Request submitted successfully');
    } catch {
      alert('Failed to submit request');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      await updateRequest(id, { status });
      loadData();
    } catch {
      alert('Failed to update request');
    }
  };

  const filteredRequests = requests.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.member_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTasks = myTasks.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-state">Loading records...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Requests & Assignments</h1>
        <p>Manage leave requests, reimbursements, and task progress.</p>
      </div>

      <div className="tabs" style={{ marginBottom: '24px' }}>
        {role === 'manager' && (
          <button
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Pending Requests ({requests.filter(r => r.status === 'Pending').length})
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'mytasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('mytasks')}
        >
          {role === 'manager' ? 'All Active Tasks' : 'My Assigned Tasks'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          + New Request
        </button>
      </div>

      {activeTab === 'requests' && role === 'manager' && (
        <div className="grid-1">
          {filteredRequests.map(req => (
            <div key={req.id} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: 'var(--purple-dim)', color: 'var(--purple-light)' }}>{req.type}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{req.title}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Requested by: <b>{req.member_name}</b> ({req.region})</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{req.description}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>📅 {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {req.status === 'Pending' ? (
                  <>
                    <button className="btn-secondary" style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }} onClick={() => handleAction(req.id, 'Rejected')}>Reject</button>
                    <button className="btn-primary" onClick={() => handleAction(req.id, 'Approved')}>Approve</button>
                  </>
                ) : (
                  <span style={{ fontWeight: '700', color: req.status === 'Approved' ? 'var(--green)' : 'var(--red)' }}>{req.status}</span>
                )}
              </div>
            </div>
          ))}
          {filteredRequests.length === 0 && <div className="empty-state">No requests found.</div>}
        </div>
      )}

      {activeTab === 'mytasks' && (
        <div className="grid-2">
          {filteredTasks.map(task => {
            const isCompleted = task.status === 'Completed';
            const isPendingApproval = task.progress_status === 'pending';

            return (
              <div key={task.id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${task.priority === 'High' ? 'var(--red)' : 'var(--purple)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>{task.project_name}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '2px' }}>{task.title}</div>
                  </div>
                  <div className="status-badge" style={{ background: isCompleted ? 'var(--green-dim)' : 'var(--blue-dim)', color: isCompleted ? 'var(--green)' : 'var(--blue)' }}>{task.status}</div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-dim)', height: '36px', overflow: 'hidden' }}>{task.description}</p>

                <div style={{ marginTop: '16px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Current Progress</span>
                      <span style={{ fontWeight: '700', color: 'var(--purple-light)' }}>{task.progress}%</span>
                   </div>
                   <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${task.progress}%`, background: 'var(--purple)', borderRadius: '3px' }} />
                   </div>
                </div>

                {role === 'employee' && !isCompleted && (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                     <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>Submit Progress Update</div>

                     {isPendingApproval ? (
                       <div style={{ padding: '10px', background: 'var(--yellow-dim)', color: 'var(--yellow)', borderRadius: '6px', fontSize: '11px', textAlign: 'center' }}>
                         ⏳ Update submitted. Awaiting manager approval.
                       </div>
                     ) : (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                         <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              value={progressForm[task.id] || ''}
                              onChange={(e) => setProgressForm(prev => ({ ...prev, [task.id]: e.target.value }))}
                              style={{ padding: '6px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px', flex: 1 }}
                            >
                              <option value="">Set Progress %</option>
                              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                                <option key={v} value={v} disabled={v <= task.progress}>{v}%</option>
                              ))}
                            </select>
                            <button
                              disabled={submitting[task.id]}
                              onClick={() => handleUpdateProgress(task)}
                              className="btn-primary"
                              style={{ padding: '6px 16px', fontSize: '12px' }}
                            >
                              {submitting[task.id] ? '...' : 'Submit'}
                            </button>
                         </div>
                         <textarea
                           placeholder="What have you completed? (Min 5 chars)"
                           value={progressNote[task.id] || ''}
                           onChange={(e) => setProgressNote(prev => ({ ...prev, [task.id]: e.target.value }))}
                           style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '11px', resize: 'none', height: '50px' }}
                         />
                       </div>
                     )}
                  </div>
                )}

                {/* Comments Section */}
                <CommentSection taskId={task.id} />
              </div>
            );
          })}
          {filteredTasks.length === 0 && <div className="empty-state">No tasks assigned.</div>}
        </div>
      )}

      {activeTab === 'new' && (
        <div className="card" style={{ maxWidth: '600px', padding: '30px', margin: '0 auto' }}>
           <h3 style={{ marginBottom: '20px' }}>Submit New Request</h3>
           <form onSubmit={handleSubmitRequest}>
              {role === 'manager' && (
                <div className="form-group">
                  <label>Assign Member</label>
                  <select required value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})}>
                    <option value="">Select Member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.region})</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Request Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="Leave">Leave Request</option>
                  <option value="Reimbursement">Reimbursement</option>
                  <option value="Resource">Resource Request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input required type="text" placeholder="Short summary" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea required placeholder="Details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ height: '100px' }} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date</label>
                  <input required type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input required type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submittingReq}>
                {submittingReq ? 'Submitting...' : 'Send Request'}
              </button>
           </form>
        </div>
      )}
    </div>
  );
}
