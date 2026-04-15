import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatInterface from './components/ChatInterface';
import AgentStatusPanel from './components/AgentStatusPanel';
import TokenMonitor from './components/TokenMonitor';
import { Menu, X } from 'lucide-react';
import './index.css';

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface AgentStatus {
  agent: string;
  status: 'Thinking' | 'Processing' | 'Completed' | 'Idle';
  progress: number;
  task: string;
}

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('total_ai_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('total_ai_current_session_id');
    return saved || null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({
    CEO: { agent: 'CEO', status: 'Idle', progress: 0, task: 'Ready' },
    Gemini: { agent: 'Gemini', status: 'Idle', progress: 0, task: 'Ready' },
    DeepSeek: { agent: 'DeepSeek', status: 'Idle', progress: 0, task: 'Ready' },
    Groq: { agent: 'Groq', status: 'Idle', progress: 0, task: 'Ready' },
    OpenRouter: { agent: 'OpenRouter', status: 'Idle', progress: 0, task: 'Ready' },
    Judge: { agent: 'Judge', status: 'Idle', progress: 0, task: 'Ready' }
  });
  const [tokens, setTokens] = useState<Record<string, number>>({
    Gemini: 0,
    DeepSeek: 0,
    Groq: 0,
    OpenRouter: 0
  });

  const socketRef = useRef<Socket | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('total_ai_sessions', JSON.stringify(sessions));
    if (currentSessionId) {
      localStorage.setItem('total_ai_current_session_id', currentSessionId);
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('agent_status', (data: AgentStatus) => {
      setAgentStatuses(prev => ({
        ...prev,
        [data.agent]: data
      }));
    });

    socketRef.current.on('chat_history', (msg: ChatMessage) => {
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, msg] };
        }
        return s;
      }));
    });

    socketRef.current.on('initial_tokens', (data: Record<string, number>) => {
      setTokens(data);
    });

    socketRef.current.on('token_usage', (data: { agent: string, tokensUsed: number, total: number }) => {
      setTokens(prev => ({
        ...prev,
        [data.agent]: data.total
      }));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleSendMessage = (prompt: string) => {
    let sid = currentSessionId;
    if (!sid) {
      sid = Date.now().toString();
      const newSession: ChatSession = {
        id: sid,
        name: prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt,
        messages: [],
        timestamp: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(sid);
    }

    setSessions(prev => prev.map(s => {
      if (s.id === sid) {
        return { ...s, messages: [...s.messages, { role: 'user', content: prompt }] };
      }
      return s;
    }));
    socketRef.current?.emit('new_task', { prompt, mode: 'Normal' });
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      localStorage.removeItem('total_ai_current_session_id');
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div>
            <h1 style={{ margin: 0, background: 'linear-gradient(90deg, #ff8a00, #e52e71)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: '1.5rem' }}>Total AI</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Multi-Agent Orchestration</p>
          </div>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat}>
          + New Chat
        </button>
      </header>

      <main className="main-content">
        <div className={`left-panel ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
             <h2 className="card-title">Recent Chats</h2>
             <div className="session-list">
               {sessions.map(s => (
                 <div 
                   key={s.id} 
                   className={`session-item ${s.id === currentSessionId ? 'active' : ''}`}
                   onClick={() => setCurrentSessionId(s.id)}
                 >
                   <span className="session-name">💬 {s.name}</span>
                   <button className="btn-delete-session" onClick={(e) => handleDeleteSession(s.id, e)}>×</button>
                 </div>
               ))}
               {sessions.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No history yet</p>}
             </div>
          </div>
          <AgentStatusPanel statuses={Object.values(agentStatuses)} />
          <TokenMonitor tokens={tokens} />
        </div>
        
        <div className="right-panel">
          <ChatInterface messages={messages} onSendMessage={handleSendMessage} />
        </div>
      </main>
    </div>
  );
}

export default App;
