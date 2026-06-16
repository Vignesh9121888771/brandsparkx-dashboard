import { useEffect, useState } from 'react';
import { getProjects, getMembers, getCapacity, getTasks, getRequests, updateRequest, createTask, getAISuggestion } from '../services/api';

const priorityColors = { Low: 'var(--green)', Medium: 'var(--yellow)', High: 'var(--orange)', Critical: 'var(--red)' };

export default function ManagerPanel({ onNavigate }) {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', assigned_to: '', project_id: '', priority: 'Medium', due_date: '', estimated_hours: 0 });
  const [aiQuery, setAiQuery] = useState({ task_title: '', task_description: '', required_role: '' });
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([getRequests(), getTasks(), getMembers(), getProjects(), getCapacity()])
      .then(([reqRes, taskRes, memRes, projRes, capRes]) => {
        setRequests(reqRes.data.data || []);
        setTasks(taskRes.data.data || []);
        setMembers(memRes.data.data || []);
        setProjects(projRes.data.data || []);
        setCapacity(capRes.data.data || []);

        const capData = capRes.data.data || [];
        const over = capData.filter(m => (parseInt(m.allocated_percent) || 0) > 85);
        const free = capData.filter(m => (parseInt(m.allocated_percent) || 0) < 40);

        const sug = [];
        over.forEach(m => sug.push(`${m.name} is over capacity (${m.allocated_percent}%). Consider offloading some tasks.`));
        free.forEach(m => sug.push(`${m.name} has high availability (${m.allocated_percent}%). Good candidate for new projects.`));
        setSuggestions(sug);
        setLoading(false);
      })
      .catch(err => {
        console.error("Manager panel fetch error:", err);
        setError("Failed to load manager data.");
        setLoading(false);
      });
  };

  useEffect(() => { loadAll(); }, []);

  const handleRequest = async (id, status) => {
    try {
      await updateRequest(id, { status });
      loadAll();
    } catch (e) {
      console.error(e);
      alert("Failed to update request.");
    }
  };

  const submitTask = async () => {
    if (!taskForm.title || !taskForm.assigned_to) return alert('Title and assignee are required');
    try {
      await createTask(taskForm);
      setTaskForm({ title: '', assigned_to: '', project_id: '', priority: 'Medium', due_date: '', estimated_hours: 0 });
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

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '100px' }}>Loading manager panel...</div>;
  if (error) return <div className="page" style={{ textAlign: 'center', padding: '100px', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Manager Control Panel</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Global oversight of requests, task assignments, and AI-assisted resource planning.</p>
      </div>

      <div className="tab-row" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {[
          { id: 'requests', label: 'Requests', icon: '📬' },
          { id: 'tasks',    label: 'Assign Tasks', icon: '📝' },
          { id: 'suggest',  label: 'Suggestions', icon: '💡' },
          { id: 'ai',       label: 'AI Helper', icon: '✨' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`filter-tab ${tab === t.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.filter(r => r.status === 'Pending').map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{r.title || 'Untitled'} — <span style={{ color: 'var(--purple-light)' }}>{r.type || 'Other'}</span></div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{r.member_name || 'Unknown'} · {r.member_role || 'N/A'} · {r.description?.slice(0, 80) || 'No description'}...</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)' }} onClick={() => handleRequest(r.id, 'Approved')}>Approve</button>
                <button className="btn btn-sm" style={{ background: 'var(--red-dim)', color: 'var(--red)' }} onClick={() => handleRequest(r.id, 'Rejected')}>Reject</button>
              </div>
            </div>
          ))}
          {requests.filter(r => r.status === 'Pending').length === 0 && (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>✅ All requests have been processed</div>
          )}
        </div>
      )}

      {/* TASKS */}
      {tab === 'tasks' && (
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
                    <span style={{ fontSize: '10px', color: priorityColors[t.priority] || priorityColors.Medium, fontWeight: '600' }}>{t.priority || 'Medium'}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{t.assignee_name || 'Unassigned'} · {t.project_name || 'No project'}</div>
                  <div style={{ fontSize: '10px', color: t.status === 'Completed' ? 'var(--green)' : t.status === 'Blocked' ? 'var(--red)' : 'var(--yellow)', marginTop: '2px' }}>{t.status || 'Pending'}</div>
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
                    <div key={p.id} style={{ padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px', border: `1px solid ${!canComplete ? 'var(--red)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{p.name || 'Untitled'}</div>
                        <span className="badge" style={{ background: (riskColor[risk] || 'var(--text-dim)') + '22', color: riskColor[risk] || 'var(--text-dim)' }}>{risk}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>{days}d left · {progress}% done · {p.client || 'Unknown Client'}</div>
                      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: progress >= 75 ? 'var(--green)' : progress >= 40 ? 'var(--yellow)' : 'var(--red)', borderRadius: '2px' }} />
                      </div>
                      {!canComplete && (
                        <div style={{ fontSize: '11px', color: 'var(--red)' }}>
                          ⚠️ At current pace, this project may not complete by deadline. Consider adding resources.
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
