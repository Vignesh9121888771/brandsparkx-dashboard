import { useEffect, useState } from 'react';
import { getRequests, updateRequest, getTasks, createTask, getMembers,
         getProjects, getAISuggestion, getCapacity } from '../services/api';
import axios from 'axios';

const BASE = 'http://localhost:5000/api';
const token = () => localStorage.getItem('bsx_token');

const inp = { width:'100%', padding:'8px 10px', background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', fontSize:'12px', outline:'none' };

const EMPTY_MEMBER = { name:'', email:'', role:'', region:'India', skills:'' };

export default function ManagerPanel({ user }) {
  const [tab,      setTab]      = useState('requests');
  const [requests, setRequests] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [aiQuery,  setAiQuery]  = useState({ task_title:'', task_description:'', required_role:'' });
  const [aiResult, setAiResult] = useState('');
  const [aiLoading,setAiLoading]= useState(false);
  const [taskForm, setTaskForm] = useState({ title:'', assigned_to:'', project_id:'', priority:'Medium', due_date:'', estimated_hours:'', description:'' });
  const [bulkMembers, setBulkMembers] = useState([{ ...EMPTY_MEMBER }]);
  const [bulkStatus,  setBulkStatus]  = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const load = () => {
    getRequests().then(r => setRequests(r.data.data));
    getTasks().then(r    => setTasks(r.data.data));
    getMembers().then(r  => setMembers(r.data.data));
    getProjects().then(r => setProjects(r.data.data));
    getCapacity().then(r => {
      setCapacity(r.data.data);
      // Auto-generate allocation suggestions
      const over = r.data.data.filter(m => parseInt(m.allocated_percent) > 85);
      const free  = r.data.data.filter(m => parseInt(m.allocated_percent) < 40);
      const sug   = over.map(o => {
        const match = free.find(f => true);
        return match ? `${o.name} is overloaded (${o.allocated_percent}%) — consider shifting work to ${match.name} (${match.allocated_percent}% allocated)` : null;
      }).filter(Boolean);
      setSuggestions(sug);
    });
  };

  useEffect(() => { load(); }, []);

  const handleRequest = async (id, status) => {
    await updateRequest(id, { status, manager_note: `${status} by manager` });
    load();
  };

  const submitTask = async () => {
    if (!taskForm.title || !taskForm.assigned_to) return alert('Title and assignee required');
    await createTask(taskForm);
    setTaskForm({ title:'', assigned_to:'', project_id:'', priority:'Medium', due_date:'', estimated_hours:'', description:'' });
    load();
  };

  const askAI = async () => {
    if (!aiQuery.task_title) return alert('Enter task title');
    setAiLoading(true); setAiResult('');
    try {
      const res = await getAISuggestion(aiQuery);
      setAiResult(res.data.suggestion);
    } catch { setAiResult('Failed. Check Gemini API key in .env'); }
    setAiLoading(false);
  };

  // Bulk member management
  const addRow    = () => setBulkMembers(b => [...b, { ...EMPTY_MEMBER }]);
  const removeRow = (i) => setBulkMembers(b => b.filter((_,idx) => idx !== i));
  const updateRow = (i, field, val) => setBulkMembers(b => b.map((m,idx) => idx===i ? { ...m, [field]:val } : m));

  const submitBulk = async () => {
    const valid = bulkMembers.filter(m => m.name && m.email && m.role);
    if (!valid.length) return setBulkStatus('error:Fill at least one complete row');
    setBulkStatus('loading');
    try {
      const res = await axios.post(`${BASE}/members/bulk`, { members: valid }, { headers: { Authorization:`Bearer ${token()}` } });
      setBulkStatus(`success:Added ${res.data.count} member(s) successfully`);
      setBulkMembers([{ ...EMPTY_MEMBER }]);
      load();
    } catch (e) {
      setBulkStatus(`error:${e.response?.data?.message || 'Failed'}`);
    }
  };

  const exportCSV = () => {
    const rows = [['Name','Email','Role','Region','Allocated %'],...members.map(m => {
      const cap = capacity.find(c => c.id === m.id);
      return [m.name, m.email, m.role, m.region, cap?.allocated_percent || 0];
    })];
    const csv   = rows.map(r => r.join(',')).join('\n');
    const blob  = new Blob([csv], { type:'text/csv' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = 'brandsparkx-capacity.csv'; a.click();
  };

  const TABS = [
    ['requests', 'Requests'],
    ['members',  'Add Members'],
    ['assign',   'Assign Task'],
    ['suggest',  'Suggestions'],
    ['ai',       '✨ AI'],
  ];

  const priorityColors = { Low:'var(--green)', Medium:'var(--yellow)', High:'var(--red)', Critical:'var(--red)' };
  const statusColors   = { Pending:'var(--yellow)', Approved:'var(--green)', Rejected:'var(--red)' };

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <div className="page-header" style={{ marginBottom:0 }}>
          <h1>Manager Panel</h1>
          <p>Approve requests, assign tasks, manage team</p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:'11px' }} onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'3px', marginBottom:'16px', background:'var(--bg-card)', padding:'3px', borderRadius:'8px', width:'fit-content', border:'1px solid var(--border)' }}>
        {TABS.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'6px 14px', border:'none', borderRadius:'6px',
            fontSize:'11px', fontWeight:'500', cursor:'pointer',
            background: tab===id ? 'var(--purple)' : 'transparent',
            color: tab===id ? '#fff' : 'var(--text-dim)',
          }}>{label}</button>
        ))}
      </div>

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'calc(100vh - 200px)', overflowY:'auto' }}>
          {requests.length === 0 && <div className="card" style={{ textAlign:'center', color:'var(--text-dim)', fontSize:'13px' }}>No requests yet 🎉</div>}
          {requests.map(r => (
            <div key={r.id} className="card" style={{ padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:'600' }}>{r.title}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'2px' }}>{r.member_name} · {r.type} · {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <span className="badge" style={{ background: r.status==='Pending'?'var(--yellow-dim)':r.status==='Approved'?'var(--green-dim)':'var(--red-dim)', color:statusColors[r.status] }}>{r.status}</span>
              </div>
              {r.description && <div style={{ fontSize:'12px', color:'var(--text-secondary)', padding:'8px 10px', background:'var(--bg-hover)', borderRadius:'6px', marginBottom:'8px' }}>{r.description}</div>}
              {r.status === 'Pending' && (
                <div style={{ display:'flex', gap:'6px' }}>
                  <button className="btn btn-success" style={{ fontSize:'11px', padding:'5px 14px' }} onClick={() => handleRequest(r.id, 'Approved')}>✓ Approve</button>
                  <button className="btn btn-danger"  style={{ fontSize:'11px', padding:'5px 14px' }} onClick={() => handleRequest(r.id, 'Rejected')}>✕ Reject</button>
                </div>
              )}
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

            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 2fr 1fr 2fr 28px', gap:'6px', marginBottom:'6px', padding:'0 4px' }}>
              {['Name *','Email *','Role *','Region','Skills',''].map(h => (
                <div key={h} style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
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

          {/* Existing members */}
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
                  {m.skills && <div style={{ fontSize:'10px', color:'var(--text-dim)', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.skills}</div>}
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
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Title *</div>
                <input className="inp" placeholder='Task title' value={taskForm.title} onChange={e => setTaskForm({...taskForm, title:e.target.value})} />
              </div>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Assign To *</div>
                <select className="inp" value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to:e.target.value})}>
                  <option value=''>Select employee</option>
                  {members.map(m => {
                    const cap = capacity.find(c => c.id === m.id);
                    const pct = parseInt(cap?.allocated_percent || 0);
                    return <option key={m.id} value={m.id}>{m.name} — {m.role} ({pct}% allocated)</option>;
                  })}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Project</div>
                <select className="inp" value={taskForm.project_id} onChange={e => setTaskForm({...taskForm, project_id:e.target.value})}>
                  <option value=''>Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ gap:'8px' }}>
                <div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Priority</div>
                  <select className="inp" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority:e.target.value})}>
                    {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Est. Hours</div>
                  <input className="inp" type='number' placeholder='0' value={taskForm.estimated_hours} onChange={e => setTaskForm({...taskForm, estimated_hours:e.target.value})} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Due Date</div>
                <input className="inp" type='date' value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date:e.target.value})} />
              </div>
              <button className="btn btn-primary" onClick={submitTask}>Assign Task</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Current Tasks ({tasks.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'400px', overflowY:'auto' }}>
              {tasks.map(t => (
                <div key={t.id} style={{ padding:'10px', background:'var(--bg-hover)', borderRadius:'8px', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <div style={{ fontSize:'12px', fontWeight:'500' }}>{t.title}</div>
                    <span style={{ fontSize:'10px', color:priorityColors[t.priority], fontWeight:'600' }}>{t.priority}</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{t.assignee_name} · {t.project_name || 'No project'}</div>
                  <div style={{ fontSize:'10px', color: t.status==='Completed'?'var(--green)':t.status==='Blocked'?'var(--red)':'var(--yellow)', marginTop:'2px' }}>{t.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUGGESTIONS */}
      {tab === 'suggest' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div className="card">
            <div className="card-title">Allocation Recommendations</div>
            <div style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'12px' }}>Auto-generated based on current workload data</div>
            {suggestions.length === 0 && (
              <div style={{ color:'var(--green)', fontSize:'13px' }}>✅ No overallocation detected — team workload is balanced!</div>
            )}
            {suggestions.map((s,i) => (
              <div key={i} className="alert-banner alert-warning" style={{ marginBottom:'8px' }}>
                💡 {s}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Deadline Risk Analysis</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {projects
                .filter(p => p.deadline && p.status !== 'Completed')
                .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
                .map(p => {
                  const days     = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
                  const progress = p.progress || 0;
                  const needed   = 100 - progress;
                  const risk     = days <= 3 ? 'Critical' : days <= 7 ? 'High' : days <= 14 ? 'Medium' : 'Low';
                  const riskColor = { Critical:'var(--red)', High:'var(--yellow)', Medium:'var(--blue)', Low:'var(--green)' };
                  const canComplete = !(days <= 7 && progress < 50);
                  return (
                    <div key={p.id} style={{ padding:'10px 12px', background:'var(--bg-hover)', borderRadius:'8px', border:`1px solid ${!canComplete?'var(--red)':'var(--border)'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                        <div style={{ fontSize:'12px', fontWeight:'500' }}>{p.name}</div>
                        <span className="badge" style={{ background: riskColor[risk]+'22', color:riskColor[risk] }}>{risk}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'6px' }}>{days}d left · {progress}% done · {p.client}</div>
                      <div style={{ height:'4px', background:'var(--border)', borderRadius:'2px', overflow:'hidden', marginBottom:'6px' }}>
                        <div style={{ height:'100%', width:`${progress}%`, background: progress>=75?'var(--green)':progress>=40?'var(--yellow)':'var(--red)', borderRadius:'2px' }} />
                      </div>
                      {!canComplete && (
                        <div style={{ fontSize:'11px', color:'var(--red)' }}>
                          ⚠️ At current pace, this project may not complete by deadline. Consider adding resources.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* AI */}
      {tab === 'ai' && (
        <div className="grid-2">
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
              <span>✨</span>
              <div className="card-title" style={{ marginBottom:0 }}>AI Assignment Suggestion</div>
            </div>
            <div style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'12px' }}>Powered by Google Gemini</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Task Title *</div>
                <input className="inp" placeholder='What needs to be assigned?' value={aiQuery.task_title} onChange={e => setAiQuery({...aiQuery, task_title:e.target.value})} />
              </div>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Description</div>
                <textarea className="inp" style={{ height:'70px', resize:'none' }} placeholder='Describe the task...' value={aiQuery.task_description} onChange={e => setAiQuery({...aiQuery, task_description:e.target.value})} />
              </div>
              <div>
                <div style={{ fontSize:'10px', color:'var(--text-dim)', marginBottom:'4px', textTransform:'uppercase' }}>Required Role</div>
                <input className="inp" placeholder='e.g. Frontend Developer' value={aiQuery.required_role} onChange={e => setAiQuery({...aiQuery, required_role:e.target.value})} />
              </div>
              <button className="btn btn-primary" onClick={askAI} disabled={aiLoading} style={{ background:'linear-gradient(135deg,var(--purple),#4f46e5)', opacity:aiLoading?0.7:1 }}>
                {aiLoading ? 'Thinking...' : '✨ Get Suggestion'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">AI Response</div>
            {aiLoading && <div style={{ display:'flex', gap:'8px', alignItems:'center', color:'var(--text-dim)', fontSize:'12px' }}><div className="spinner" />Analyzing team data...</div>}
            {aiResult && !aiLoading && <div style={{ fontSize:'12px', lineHeight:'1.7', color:'var(--text-secondary)', background:'var(--bg-hover)', padding:'12px', borderRadius:'8px', border:'1px solid var(--border-light)', whiteSpace:'pre-wrap' }}>{aiResult}</div>}
            {!aiResult && !aiLoading && <div style={{ color:'var(--text-dim)', fontSize:'12px', textAlign:'center', padding:'30px' }}>Fill in the task details and click "Get Suggestion"</div>}
          </div>
        </div>
      )}
    </div>
  );
}