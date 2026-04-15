"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentFlow = runAgentFlow;
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const deepseek = new openai_1.OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
const groq = new openai_1.OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
const openrouter = new openai_1.OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Total AI'
    }
});
const GLOBAL_PROMPT = process.env.GLOBAL_SYSTEM_PROMPT || 'Luôn trả lời bằng tiếng Việt, ngắn gọn.';
function runAgentFlow(prompt, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        socket.emit('agent_status', { agent: 'CEO', status: 'Processing', progress: 30, task: 'Khởi chạy Gemini & DeepSeek...' });
        socket.emit('chat_history', { role: 'system', content: `[CEO] Tiến hành gửi nhiệm vụ cho Gemini và DeepSeek. Hệ thống sẽ áp dụng cấu hình Global System Prompt.` });
        socket.emit('agent_status', { agent: 'Gemini', status: 'Thinking', progress: 10, task: 'Chờ phản hồi...' });
        socket.emit('agent_status', { agent: 'DeepSeek', status: 'Thinking', progress: 10, task: 'Chờ phản hồi...' });
        const [geminiResult, deepseekResult] = yield Promise.all([
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
            const judgeRes = yield fetchGroq(synthesisPrompt);
            finalResponse = judgeRes.text;
        }
        catch (e) {
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
    });
}
function runFallbackAgent(primary, secondary, fetchPrimary, fetchSecondary, prompt, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            socket.emit('agent_status', { agent: primary, status: 'Processing', progress: 60, task: 'Đang xử lý...' });
            const res = yield fetchPrimary(prompt);
            socket.emit('agent_status', { agent: primary, status: 'Completed', progress: 100, task: 'Hoàn tất' });
            socket.emit('token_usage', { agent: primary, tokensUsed: res.tokens });
            return res;
        }
        catch (e) {
            console.error(`${primary} lỗi:`, e.message);
            socket.emit('agent_status', { agent: primary, status: 'Idle', progress: 0, task: 'Lỗi / Hết Token' });
            socket.emit('chat_history', { role: 'system', content: `[CEO] ${primary} báo lỗi hoặc hết Token. Điều phối gấp sang ${secondary}!` });
            socket.emit('agent_status', { agent: 'CEO', status: 'Processing', progress: 80, task: `Điều tiết sang ${secondary}` });
            socket.emit('agent_status', { agent: secondary, status: 'Processing', progress: 50, task: 'Đang xử lý thay...' });
            try {
                const fallbackRes = yield fetchSecondary(prompt);
                socket.emit('agent_status', { agent: secondary, status: 'Completed', progress: 100, task: 'Hoàn tất' });
                socket.emit('token_usage', { agent: secondary, tokensUsed: fallbackRes.tokens });
                socket.emit('agent_status', { agent: 'CEO', status: 'Processing', progress: 90, task: 'Tổng hợp nhánh' });
                return fallbackRes;
            }
            catch (e2) {
                console.error(`${secondary} cũng lỗi:`, e2.message);
                socket.emit('agent_status', { agent: secondary, status: 'Idle', progress: 0, task: 'Khởi chạy thất bại' });
                return { text: `[Lỗi bảo trì: Cả ${primary} và ${secondary} đều từ chối yêu cầu]`, tokens: 0 };
            }
        }
    });
}
function fetchDeepSeek(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const res = yield openrouter.chat.completions.create({
            model: 'deepseek/deepseek-chat',
            messages: [{ role: 'system', content: GLOBAL_PROMPT }, { role: 'user', content: prompt }]
        });
        return { text: res.choices[0].message.content || '', tokens: ((_a = res.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0 };
    });
}
function fetchGroq(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const res = yield groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'system', content: GLOBAL_PROMPT }, { role: 'user', content: prompt }]
        });
        return { text: res.choices[0].message.content || '', tokens: ((_a = res.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0 };
    });
}
function fetchOpenRouter(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const res = yield openrouter.chat.completions.create({
            model: 'google/gemma-2-9b-it:free',
            messages: [{ role: 'system', content: GLOBAL_PROMPT }, { role: 'user', content: prompt }]
        });
        return { text: res.choices[0].message.content || '', tokens: ((_a = res.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0 };
    });
}
function fetchGemini(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const API_KEY = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        const body = {
            contents: [{ role: "user", parts: [{ text: GLOBAL_PROMPT + '\n\n' + prompt }] }]
        };
        const response = yield fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errText = yield response.text();
            throw new Error(`Gemini trả về lỗi HTTP ${response.status}: ${errText}`);
        }
        const data = yield response.json();
        const txt = ((_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '';
        const tokens = ((_f = data.usageMetadata) === null || _f === void 0 ? void 0 : _f.totalTokenCount) || 0;
        return { text: txt, tokens };
    });
}
