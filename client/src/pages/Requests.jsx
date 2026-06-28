import { useState, useEffect } from 'react';
import {
  getRequests, createRequest, updateRequest, getMembers,
  getTasks, createTask
} from '../services/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  const [successMsg,   setSuccessMsg]   = useState({});
  const [errorMsg,     setErrorMsg]     = useState({});

  // New request form
  const [form, setForm] = useState({
    member_id: '', type: 'Leave', title: '', description: '', start_date: '', end_date: ''
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProgress = async (task) => {
    const progress = progressForm[task.id];
    const note     = progressNote[task.id];

    if (progress === undefined || progress === null)
      return setErrorMsg(p => ({ ...p, [task.id]: 'Please set a progress value' }));
    if (!note || note.trim() === '')
      return setErrorMsg(p => ({ ...p, [task.id]: 'Please describe what you completed' }));

    // Check not submitting same or lower progress
    if (parseInt(progress) <= (task.progress || 0))
      return setErrorMsg(p => ({ ...p, [task.id]: `Progress must be higher than current ${task.progress || 0}%` }));

    try {
      setSubmitting(p => ({ ...p, [task.id]: true }));
      setErrorMsg(p => ({ ...p, [task.id]: '' }));

      const token = localStorage.getItem('bsx_token');
      await axios.post(`${API_URL}/tasks/${task.id}/progress`, {
        progress: parseInt(progress),
        note: note.trim(),
        member_id: user.member_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSuccessMsg(p => ({ ...p, [task.id]: '✅ Progress submitted! Awaiting manager approval.' }));
      setProgressForm(p => ({ ...p, [task.id]: undefined }));
      setProgressNote(p => ({ ...p, [task.id]: '' }));
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit progress';
      setErrorMsg(p => ({ ...p, [task.id]: msg }));
    } finally {
      setSubmitting(p => ({ ...p, [task.id]: false }));
    }
  };

  const handleRequestSubmit = async () => {
    if (!form.title || !form.member_id)
      return alert('Please fill in all required fields');
    try {
      setSubmittingReq(true);
      await createRequest(form);
      setForm({ member_id: '', type: 'Leave', title: '', description: '', start_date: '', end_date: '' });
      await loadData();
      alert('Request submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleApproveReject = async (id, status) => {
    try {
      await updateRequest(id, { status });
      await loadData();
    } catch (err) {
      alert('Failed to update request');
    }
  };

  const getStatusColor = s => ({
    Pending:  'var(--yellow)', Approved: 'var(--green)',
    Rejected: 'var(--red)',   'In Progress': 'var(--blue)', Completed: 'var(--green)'
  }[s] || 'var(--text-dim)');

  const getStatusBg = s => ({
    Pending:  'var(--yellow-dim)', Approved: 'var(--green-dim)',
    Rejected: 'var(--red-dim)',    'In Progress': 'var(--blue-dim)', Completed: 'var(--green-dim)'
  }[s] || 'var(--bg-hover)');

  const getProgressColor = v => v >= 100 ? 'var(--green)' : v >= 60 ? 'var(--purple-light)' : v >= 30 ? 'var(--yellow)' : 'var(--text-dim)';

  const filteredRequests = requests.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.member_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Requests</h1>
        <p>Manage leave requests and track task progress</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {role === 'employee' && (
          <button
            className={`filter-tab ${activeTab === 'mytasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('mytasks')}
          >My Tasks & Progress</button>
        )}
        <button
          className={`filter-tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          {role === 'manager' ? 'All Requests' : 'My Requests'}
        </button>
        {role === 'manager' && (
          <button
            className={`filter-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >+ New Request</button>
        )}
      </div>

      {/* MY TASKS TAB — Employee Progress Tracking */}
      {activeTab === 'mytasks' && role === 'employee' && (
        <div>
          {myTasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              No tasks assigned to you yet.
            </div>
          ) : myTasks.map(task => (
            <div key={task.id} className="card" style={{ marginBottom: '16px' }}>
              {/* Task header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>{task.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {task.project_name} · Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px', padding: '3px 8px', borderRadius: '20px',
                    background: getStatusBg(task.status), color: getStatusColor(task.status)
                  }}>{task.status}</span>
                  {task.progress_status === 'pending_approval' && (
                    <span style={{
                      fontSize: '10px', padding: '3px 8px', borderRadius: '20px',
                      background: 'var(--yellow-dim)', color: 'var(--yellow)'
                    }}>⏳ Pending Approval</span>
                  )}
                </div>
              </div>

              {/* Current progress bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: getProgressColor(task.progress || 0) }}>
                    {task.progress || 0}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{
                    width: `${task.progress || 0}%`,
                    background: getProgressColor(task.progress || 0)
                  }} />
                </div>
                {task.progress_note && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                    Last update: "{task.progress_note}"
                  </div>
                )}
              </div>

              {/* Submit new progress — only if no pending update */}
              {task.progress_status !== 'pending_approval' && task.progress < 100 && (
                <div style={{
                  padding: '14px', background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: 'var(--text-primary)' }}>
                    Submit Progress Update
                  </div>

                  {/* Slider */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>New Progress</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--purple-light)' }}>
                        {progressForm[task.id] ?? (task.progress || 0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={task.progress || 0}
                      max="100"
                      step="5"
                      value={progressForm[task.id] ?? (task.progress || 0)}
                      onChange={e => setProgressForm(p => ({ ...p, [task.id]: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--purple)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
                      <span>{task.progress || 0}% (current)</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Note — required */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      What did you complete? <span style={{ color: 'var(--red)' }}>*</span>
                    </div>
                    <textarea
                      className="inp"
                      rows={3}
                      placeholder="e.g. Completed login page UI, fixed 3 bugs, connected API endpoints..."
                      value={progressNote[task.id] || ''}
                      onChange={e => setProgressNote(p => ({ ...p, [task.id]: e.target.value }))}
                      style={{ resize: 'vertical', fontSize: '12px' }}
                    />
                  </div>

                  {/* Error / Success messages */}
                  {errorMsg[task.id] && (
                    <div style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '8px' }}>
                      ⚠ {errorMsg[task.id]}
                    </div>
                  )}
                  {successMsg[task.id] && (
                    <div style={{ fontSize: '11px', color: 'var(--green)', marginBottom: '8px' }}>
                      {successMsg[task.id]}
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={() => handleSubmitProgress(task)}
                    disabled={submitting[task.id]}
                    style={{ width: '100%' }}
                  >
                    {submitting[task.id] ? 'Submitting...' : 'Submit for Manager Approval'}
                  </button>
                </div>
              )}

              {/* Pending approval message */}
              {task.progress_status === 'pending_approval' && (
                <div style={{
                  padding: '12px', background: 'var(--yellow-dim)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)',
                  fontSize: '12px', color: 'var(--yellow)', textAlign: 'center'
                }}>
                  ⏳ Your progress update is waiting for manager approval
                </div>
              )}

              {/* Completed */}
              {task.progress >= 100 && (
                <div style={{
                  padding: '12px', background: 'var(--green-dim)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)',
                  fontSize: '12px', color: 'var(--green)', textAlign: 'center'
                }}>
                  ✅ Task completed!
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div>
          {/* New request form for employees */}
          {role === 'employee' && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-title">Submit a Request</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Request Type</div>
                  <select className="inp" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Leave</option>
                    <option>Permission</option>
                    <option>Reallocation</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Title *</div>
                  <input className="inp" placeholder="Brief title" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Start Date</div>
                  <input className="inp" type="date" value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>End Date</div>
                  <input className="inp" type="date" value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Description</div>
                <textarea className="inp" rows={2} placeholder="Provide more details..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <input type="hidden" value={form.member_id} />
              <button className="btn btn-primary" onClick={() => {
                setForm(p => ({ ...p, member_id: user?.member_id || '' }));
                handleRequestSubmit();
              }} disabled={submittingReq}>
                {submittingReq ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          )}

          {/* Requests list */}
          <div className="table-wrap">
            <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
              <span>Title</span><span>Type</span><span>Member</span><span>Status</span>
              {role === 'manager' && <span>Action</span>}
            </div>
            {filteredRequests.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                No requests found
              </div>
            ) : filteredRequests.map(r => (
              <div key={r.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{r.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{r.description?.slice(0,50)}</div>
                </div>
                <span className="badge badge-purple">{r.type}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.member_name}</span>
                <span style={{
                  fontSize: '10px', padding: '3px 8px', borderRadius: '20px',
                  background: getStatusBg(r.status), color: getStatusColor(r.status)
                }}>{r.status}</span>
                {role === 'manager' && r.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => handleApproveReject(r.id, 'Approved')}>✓</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => handleApproveReject(r.id, 'Rejected')}>✗</button>
                  </div>
                )}
                {role === 'manager' && r.status !== 'Pending' && (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Reviewed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW REQUEST TAB — Manager only */}
      {activeTab === 'new' && role === 'manager' && (
        <div className="card">
          <div className="card-title">Submit a Request</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Employee *</div>
              <select className="inp" value={form.member_id} onChange={e => setForm(p => ({ ...p, member_id: e.target.value }))}>
                <option value="">Select employee</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Request Type</div>
              <select className="inp" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option>Leave</option><option>Permission</option>
                <option>Reallocation</option><option>Other</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Title *</div>
              <input className="inp" placeholder="Brief title of your request" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Start Date</div>
              <input className="inp" type="date" value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>End Date</div>
              <input className="inp" type="date" value={form.end_date}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Description</div>
            <textarea className="inp" rows={3} placeholder="Provide more details..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
          <button className="btn btn-primary" onClick={handleRequestSubmit} disabled={submittingReq}>
            {submittingReq ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}
    </div>
  );
}
