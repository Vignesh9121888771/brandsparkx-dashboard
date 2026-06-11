import { useEffect, useState } from 'react';
import { getRequests, updateRequest, getTasks, createTask, getMembers, getProjects, getAISuggestion } from '../services/api';

const inp = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  fontSize: '13px', outline: 'none',
};

export default function ManagerPanel() {
  const [requests, setRequests] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [aiQuery,  setAiQuery]  = useState({ task_title: '', task_description: '', required_role: '' });
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', assigned_to: '', project_id: '', priority: 'Medium', due_date: '', estimated_hours: '' });
  const [tab, setTab] = useState('requests');

  const load = () => {
    getRequests().then(r => setRequests(r.data.data));
    getTasks().then(r    => setTasks(r.data.data));
    getMembers().then(r  => setMembers(r.data.data));
    getProjects().then(r => setProjects(r.data.data));
  };

  useEffect(() => { load(); }, []);

  const handleRequest = async (id, status, note = '') => {
    await updateRequest(id, { status, manager_note: note });
    load();
  };

  const submitTask = async () => {
    if (!taskForm.title || !taskForm.assigned_to) return alert('Title and assignee required');
    await createTask(taskForm);
    setTaskForm({ title: '', assigned_to: '', project_id: '', priority: 'Medium', due_date: '', estimated_hours: '' });
    load();
  };

  const askAI = async () => {
    if (!aiQuery.task_title) return alert('Enter a task title first');
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await getAISuggestion(aiQuery);
      setAiResult(res.data.suggestion);
    } catch {
      setAiResult('Failed to get AI suggestion. Check your Gemini API key.');
    }
    setAiLoading(false);
  };

  const statusColors = { Pending: 'var(--yellow)', Approved: 'var(--green)', Rejected: 'var(--red)' };
  const priorityColors = { Low: 'var(--green)', Medium: 'var(--yellow)', High: 'var(--red)', Critical: 'var(--red)' };

  const tabs = ['requests', 'assign', 'ai'];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Manager Panel</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Approve requests, assign tasks, and get AI-powered suggestions.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['requests', 'Requests'], ['assign', 'Assign Task'], ['ai', '✨ AI Suggest']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 18px', border: 'none', borderRadius: 'var(--radius-sm)',
            fontSize: '13px', fontWeight: '500',
            background: tab === id ? 'var(--purple)' : 'transparent',
            color: tab === id ? '#fff' : 'var(--text-dim)',
          }}>{label}</button>
        ))}
      </div>

      {/* Requests tab */}
      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.filter(r => r.status === 'Pending').map(r => (
            <div key={r.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{r.member_name} · {r.type}</div>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'var(--yellow-dim)', color: 'var(--yellow)', fontWeight: '600' }}>Pending</span>
              </div>
              {r.description && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>{r.description}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleRequest(r.id, 'Approved')} style={{
                  padding: '7px 18px', background: 'var(--green-dim)', color: 'var(--green)',
                  border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '600'
                }}>✓ Approve</button>
                <button onClick={() => handleRequest(r.id, 'Rejected')} style={{
                  padding: '7px 18px', background: 'var(--red-dim)', color: 'var(--red)',
                  border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '600'
                }}>✕ Reject</button>
              </div>
            </div>
          ))}
          {requests.filter(r => r.status === 'Pending').length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              No pending requests 🎉
            </div>
          )}
        </div>
      )}

      {/* Assign task tab */}
      {tab === 'assign' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Assign New Task</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>TASK TITLE *</label>
                <input style={inp} placeholder='Task title' value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>ASSIGN TO *</label>
                <select style={inp} value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                  <option value=''>Select employee</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>PROJECT</label>
                <select style={inp} value={taskForm.project_id} onChange={e => setTaskForm({ ...taskForm, project_id: e.target.value })}>
                  <option value=''>Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>PRIORITY</label>
                  <select style={inp} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>EST. HOURS</label>
                  <input style={inp} type='number' placeholder='0' value={taskForm.estimated_hours} onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>DUE DATE</label>
                <input style={inp} type='date' value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
              <button onClick={submitTask} style={{
                background: 'var(--purple)', color: '#fff', border: 'none',
                padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: '500'
              }}>Assign Task</button>
            </div>
          </div>

          {/* Task list */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Current Tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {tasks.map(t => (
                <div key={t.id} style={{ padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{t.title}</span>
                    <span style={{ fontSize: '10px', color: priorityColors[t.priority], fontWeight: '600' }}>{t.priority}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{t.assignee_name} · {t.project_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI tab */}
      {tab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>✨</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>AI Assignment Suggestion</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>Powered by Google Gemini</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>TASK TITLE *</label>
                <input style={inp} placeholder='What task needs to be assigned?' value={aiQuery.task_title} onChange={e => setAiQuery({ ...aiQuery, task_title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>DESCRIPTION</label>
                <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} placeholder='Describe the task...' value={aiQuery.task_description} onChange={e => setAiQuery({ ...aiQuery, task_description: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>REQUIRED ROLE</label>
                <input style={inp} placeholder='e.g. Frontend Developer, UI Designer' value={aiQuery.required_role} onChange={e => setAiQuery({ ...aiQuery, required_role: e.target.value })} />
              </div>
              <button onClick={askAI} disabled={aiLoading} style={{
                background: 'linear-gradient(135deg, var(--purple), #4f46e5)',
                color: '#fff', border: 'none', padding: '10px',
                borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: '500',
                opacity: aiLoading ? 0.7 : 1
              }}>{aiLoading ? '✨ Thinking...' : '✨ Get AI Suggestion'}</button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Suggestion</div>
            {aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '13px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid var(--purple)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analyzing team capacity and skills...
              </div>
            )}
            {aiResult && !aiLoading && (
              <div style={{
                fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)',
                background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)', whiteSpace: 'pre-wrap'
              }}>{aiResult}</div>
            )}
            {!aiResult && !aiLoading && (
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>
                Fill in the task details and click "Get AI Suggestion" to see who's best suited for the task.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}