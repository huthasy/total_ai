import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatInterface from './components/ChatInterface';
import AgentStatusPanel from './components/AgentStatusPanel';
import TokenMonitor from './components/TokenMonitor';
import './index.css';

const SOCKET_SERVER_URL = 'http://localhost:3001';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    socketRef.current.on('token_usage', (data: { agent: string, tokensUsed: number }) => {
      setTokens(prev => ({
        ...prev,
        [data.agent]: prev[data.agent] + data.tokensUsed
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
      <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
        <div>
          <h1 style={{ margin: 0, background: 'linear-gradient(90deg, #ff8a00, #e52e71)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Total AI</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Multi-Agent Orchestration</p>
        </div>
        <button className="new-chat-btn" onClick={() => setMessages([])}>
          + New Chat
        </button>
      </header>
      
      <main className="main-content">
        <div className="left-panel">
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
