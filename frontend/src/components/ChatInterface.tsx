import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../App';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
}

export default function ChatInterface({ messages, onSendMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="chat-interface card">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', opacity: 0.5, marginTop: '50px' }}>
            <p>Welcome to Total AI. How can our agents assist you today?</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.role}`}>
              <div className="message-bubble">
                <div className="message-role">{msg.role === 'assistant' ? 'Judge Agent (Final)' : msg.role === 'system' ? 'System' : 'You'}</div>
                <div className="message-content" style={{ margin: 0 }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-wrapper">
        <input 
          type="text" 
          className="chat-input" 
          placeholder="Ask something complicated..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="chat-submit" disabled={!input.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
