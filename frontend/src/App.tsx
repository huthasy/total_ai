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

export interface AgentStatus {
  agent: string;
  status: 'Thinking' | 'Processing' | 'Completed' | 'Idle';
  progress: number;
  task: string;
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('total_ai_chat_history');
    return saved ? JSON.parse(saved) : [];
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

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem('total_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('agent_status', (data: AgentStatus) => {
      setAgentStatuses(prev => ({
        ...prev,
        [data.agent]: data
      }));
    });

    socketRef.current.on('chat_history', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
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
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    socketRef.current?.emit('new_task', { prompt, mode: 'Normal' });
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
        <button className="new-chat-btn" onClick={() => {
          if (confirm('Delete all chat history?')) {
            setMessages([]);
            localStorage.removeItem('total_ai_chat_history');
          }
        }}>
          + New Chat
        </button>
      </header>
      
      <main className="main-content">
        <div className={`left-panel ${isSidebarOpen ? 'open' : 'closed'}`}>
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
