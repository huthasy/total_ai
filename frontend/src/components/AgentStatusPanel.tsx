import { AgentStatus } from '../App';

export default function AgentStatusPanel({ statuses }: { statuses: AgentStatus[] }) {
  return (
    <div className="card">
      <h2 className="card-title">Agent Status</h2>
      <div className="agent-list">
        {statuses.map(s => (
          <div key={s.agent} className={`agent-card status-${s.status.toLowerCase()}`}>
            <div className="agent-header">
              <span className="agent-name">{s.agent}</span>
              <span className="agent-state">{s.status}</span>
            </div>
            <div className="agent-task">{s.task}</div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${s.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
