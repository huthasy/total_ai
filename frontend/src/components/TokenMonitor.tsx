import React from 'react';

const LIMITS = {
  Gemini: 50000,
  DeepSeek: 50000,
  Groq: 50000,
  OpenRouter: 50000
};

export default function TokenMonitor({ tokens }: { tokens: Record<string, number> }) {
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2 className="card-title">Token Usage Monitor</h2>
      <div className="token-list">
        {Object.entries(tokens).map(([agent, used]) => {
          const limit = LIMITS[agent as keyof typeof LIMITS] || 10000;
          const percentage = Math.min((used / limit) * 100, 100).toFixed(1);
          return (
            <div key={agent} className="token-item">
              <div className="token-header">
                <span>{agent}</span>
                <span>{used} / {limit} ({percentage}%)</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className={`progress-bar-fill ${used > limit * 0.8 ? 'warning' : ''}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
