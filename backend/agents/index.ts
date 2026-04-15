import fs from 'fs';
import path from 'path';

const TOKEN_STORE_PATH = path.join(__dirname, '../../tokenStore.json');

// Global Token Registry
let tokenRegistry: Record<string, number> = {
    Gemini: 0,
    DeepSeek: 0,
    Groq: 0,
    OpenRouter: 0
};

// Load initial tokens
if (fs.existsSync(TOKEN_STORE_PATH)) {
    try {
        const data = JSON.parse(fs.readFileSync(TOKEN_STORE_PATH, 'utf-8'));
        tokenRegistry = { ...tokenRegistry, ...data };
    } catch (e) {
        console.error('Lỗi khi load tokenStore.json');
    }
}

function saveTokens() {
    fs.writeFileSync(TOKEN_STORE_PATH, JSON.stringify(tokenRegistry, null, 2));
}

export function getCurrentTokens() {
    return tokenRegistry;
}

const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
const openrouter = new OpenAI({ 
    apiKey: process.env.OPENROUTER_API_KEY, 
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Total AI'
    }
});

const GLOBAL_PROMPT = process.env.GLOBAL_SYSTEM_PROMPT || 'Luôn trả lời bằng tiếng Việt, ngắn gọn.';

export async function runAgentFlow(prompt: string, socket: Socket) {
  socket.emit('agent_status', { agent: 'CEO', status: 'Processing', progress: 30, task: 'Khởi chạy Gemini & DeepSeek...' });
  socket.emit('chat_history', { role: 'system', content: `[CEO] Tiến hành gửi nhiệm vụ cho Gemini và DeepSeek. Hệ thống sẽ áp dụng cấu hình Global System Prompt.` });

  socket.emit('agent_status', { agent: 'Gemini', status: 'Thinking', progress: 10, task: 'Chờ phản hồi...' });
  socket.emit('agent_status', { agent: 'DeepSeek', status: 'Thinking', progress: 10, task: 'Chờ phản hồi...' });

  const [geminiResult, deepseekResult] = await Promise.all([
    runFallbackAgent('Gemini', 'Groq', fetchGemini, fetchGroq, prompt, socket),
    runFallbackAgent('DeepSeek', 'OpenRouter', fetchDeepSeek, fetchOpenRouter, prompt, socket)
  ]);

  if (!geminiResult || !deepseekResult) {
      socket.emit('chat_history', { role: 'assistant', content: 'Lỗi: Không thể thu thập đủ kết quả từ các Agent.' });
      return;
  }

  socket.emit('agent_status', { agent: 'Judge', status: 'Processing', progress: 50, task: 'Đánh giá & Tổng hợp...' });

  const synthesisPrompt = `Nhiệm vụ ban đầu: "${prompt}".\n\nNguồn 1: ${geminiResult.text}\n\nNguồn 2: ${deepseekResult.text}\n\n[Judge Evaluator] Hãy đối chiếu 2 nguồn kết quả trên để chắt lọc những ưu điểm và gộp lại thành phiên bản cuối cùng. TUÂN THỦ: ${GLOBAL_PROMPT}.`;
  
  let finalResponse = '';
  try {
      const judgeRes = await fetchGroq(synthesisPrompt);
      finalResponse = judgeRes.text;
  } catch(e) {
      finalResponse = "Lỗi gọi Judge AI.\n\nNguồn 1: " + geminiResult.text + "\n\nNguồn 2: " + deepseekResult.text;
  }

  socket.emit('agent_status', { agent: 'Judge', status: 'Completed', progress: 100, task: 'Hoàn thành' });
  socket.emit('chat_history', { role: 'assistant', content: finalResponse });
  socket.emit('agent_status', { agent: 'CEO', status: 'Idle', progress: 0, task: 'Sẵn sàng' });

  setTimeout(() => {
    ['Gemini', 'DeepSeek', 'Groq', 'OpenRouter', 'Judge'].forEach(a => {
        socket.emit('agent_status', { agent: a, status: 'Idle', progress: 0, task: 'Sẵn sàng' });
    });
  }, 3000);
}

async function runFallbackAgent(primary: string, secondary: string, fetchPrimary: Function, fetchSecondary: Function, prompt: string, socket: Socket) {
    try {
        socket.emit('agent_status', { agent: primary, status: 'Processing', progress: 60, task: 'Đang xử lý...' });
        const res = await fetchPrimary(prompt);
        socket.emit('agent_status', { agent: primary, status: 'Completed', progress: 100, task: 'Hoàn tất' });
        
        // Update Registry
        tokenRegistry[primary] = (tokenRegistry[primary] || 0) + res.tokens;
        saveTokens();

        socket.emit('token_usage', { agent: primary, tokensUsed: res.tokens, total: tokenRegistry[primary] });
        return res;
    } catch (e: any) {
        console.error(`${primary} lỗi:`, e.message);
        socket.emit('agent_status', { agent: primary, status: 'Idle', progress: 0, task: 'Lỗi / Hết Token' });
        socket.emit('chat_history', { role: 'system', content: `[CEO] ${primary} báo lỗi hoặc hết Token. Điều phối gấp sang ${secondary}!` });
        socket.emit('agent_status', { agent: 'CEO', status: 'Processing', progress: 80, task: `Điều tiết sang ${secondary}` });
        socket.emit('agent_status', { agent: secondary, status: 'Processing', progress: 50, task: 'Đang xử lý thay...' });
        
        try {
            const fallbackRes = await fetchSecondary(prompt);
            socket.emit('agent_status', { agent: secondary, status: 'Completed', progress: 100, task: 'Hoàn tất' });
            
            // Update Registry
            tokenRegistry[secondary] = (tokenRegistry[secondary] || 0) + fallbackRes.tokens;
            saveTokens();

            socket.emit('token_usage', { agent: secondary, tokensUsed: fallbackRes.tokens, total: tokenRegistry[secondary] });
            socket.emit('agent_status', { agent: 'CEO', status: 'Processing', progress: 90, task: 'Tổng hợp nhánh' });
            return fallbackRes;
        } catch(e2: any) {
            console.error(`${secondary} cũng lỗi:`, e2.message);
            socket.emit('agent_status', { agent: secondary, status: 'Idle', progress: 0, task: 'Khởi chạy thất bại' });
            return { text: `[Lỗi bảo trì: Cả ${primary} và ${secondary} đều từ chối yêu cầu]`, tokens: 0 };
        }
    }
}

async function fetchDeepSeek(prompt: string) {
    const res = await openrouter.chat.completions.create({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'system', content: GLOBAL_PROMPT }, { role: 'user', content: prompt }]
    });
    return { text: res.choices[0].message.content || '', tokens: res.usage?.total_tokens || 0 };
}

async function fetchGroq(prompt: string) {
    const res = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: GLOBAL_PROMPT }, { role: 'user', content: prompt }]
    });
    return { text: res.choices[0].message.content || '', tokens: res.usage?.total_tokens || 0 };
}

async function fetchOpenRouter(prompt: string) {
    const res = await openrouter.chat.completions.create({
        model: 'google/gemma-2-9b-it:free',
        messages: [{ role: 'system', content: GLOBAL_PROMPT }, { role: 'user', content: prompt }]
    });
    return { text: res.choices[0].message.content || '', tokens: res.usage?.total_tokens || 0 };
}

async function fetchGemini(prompt: string) {
    const API_KEY = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    const body = {
        contents: [{ role: "user", parts: [{ text: GLOBAL_PROMPT + '\n\n' + prompt }] }]
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini trả về lỗi HTTP ${response.status}: ${errText}`);
    }
    
    const data = await response.json();
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokens = data.usageMetadata?.totalTokenCount || 0;
    return { text: txt, tokens };
}
