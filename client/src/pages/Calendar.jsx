import { useEffect, useState } from 'react';
import { getProjects, getTasks } from '../services/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Calendar() {
  const [projects, setProjects] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [current,  setCurrent]  = useState(new Date());
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    Promise.all([getProjects(), getTasks()])
      .then(([projRes, taskRes]) => {
        setProjects(projRes.data.data || []);
        setTasks(taskRes.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Calendar fetch error:", err);
        setError("Failed to load calendar data.");
        setLoading(false);
      });
  }, []);

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const getEventsForDay = (day) => {
    const date = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const pEvents = projects.filter(p => p.deadline?.slice(0,10) === date)
      .map(p => ({ type: 'project', label: p.name || 'Untitled Project', status: p.status }));
    const tEvents = tasks.filter(t => t.due_date?.slice(0,10) === date)
      .map(t => ({ type: 'task', label: t.title || 'Untitled Task', priority: t.priority }));
    return [...pEvents, ...tEvents];
  };

  const today    = new Date();
  const isToday  = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Upcoming deadlines
  const upcoming = projects
    .filter(p => p.deadline && new Date(p.deadline) >= new Date())
    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '100px' }}>Loading calendar...</div>;
  if (error) return <div className="page" style={{ textAlign: 'center', padding: '100px', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Calendar</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Project deadlines and task due dates at a glance.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>

        {/* Calendar grid */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button onClick={prev} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>‹</button>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>{MONTHS[month]} {year}</span>
            <button onClick={next} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '8px' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', padding: '4px' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day    = i + 1;
              const events = getEventsForDay(day);
              const tod    = isToday(day);
              return (
                <div key={day} style={{
                  minHeight: '64px', padding: '6px',
                  background: tod ? 'var(--purple-dim)' : 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${tod ? 'var(--purple)' : 'var(--border)'}`,
                }}>
                  <div style={{
                    fontSize: '12px', fontWeight: tod ? '700' : '400',
                    color: tod ? 'var(--purple-light)' : 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>{day}</div>
                  {events.slice(0,2).map((ev, ei) => (
                    <div key={ei} style={{
                      fontSize: '9px', padding: '2px 4px', borderRadius: '3px', marginBottom: '2px',
                      background: ev.type === 'project' ? 'var(--red-dim)' : 'var(--blue-dim)',
                      color: ev.type === 'project' ? 'var(--red)' : 'var(--blue)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>{ev.label}</div>
                  ))}
                  {events.length > 2 && <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>+{events.length - 2} more</div>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            {[['var(--red)', 'Project Deadline'], ['var(--blue)', 'Task Due Date'], ['var(--purple)', 'Today']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c }} />{l}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming deadlines panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>Upcoming Deadlines</div>
            {upcoming.map(p => {
              const days   = Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24));
              const urgent = days <= 7;
              const sc     = { Active: 'var(--green)', 'In Review': 'var(--yellow)', Planning: 'var(--purple-light)' };
              return (
                <div key={p.id} style={{
                  padding: '10px 12px', background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)', marginBottom: '8px',
                  border: `1px solid ${urgent ? 'var(--red)' : 'var(--border)'}`,
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '3px' }}>{p.name || 'Untitled'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>{p.client || 'Unknown'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: urgent ? 'var(--red-dim)' : 'var(--bg-card)', color: urgent ? 'var(--red)' : 'var(--text-dim)' }}>
                      {days <= 0 ? 'Overdue!' : `${days} days left`}
                    </span>
                    <span style={{ fontSize: '10px', color: sc[p.status] || 'var(--text-dim)' }}>{p.status || 'N/A'}</span>
                  </div>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No upcoming deadlines</div>
            )}
          </div>

          {/* Priority order */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>Priority Order</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px' }}>Projects sorted by nearest deadline</div>
            {projects
              .filter(p => p.deadline && p.status !== 'Completed')
              .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
              .slice(0,4)
              .map((p,i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: i === 0 ? 'var(--red-dim)' : i === 1 ? 'var(--yellow-dim)' : 'var(--bg-hover)',
                    color: i === 0 ? 'var(--red)' : i === 1 ? 'var(--yellow)' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700', flexShrink: 0
                  }}>{i+1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Untitled'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{new Date(p.deadline).toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
