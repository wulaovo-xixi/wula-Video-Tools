import React, { useState, useEffect, useRef } from 'react';

// --- 聊天组件 (ChatWidget) ---
function ChatWidget({ videoContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是 DeepSeek 剪辑顾问。有什么我可以帮你的吗？' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const q = input;
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, videoContext })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || "API 没返回内容" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "发送失败，请检查网络或 Key。" }]);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    btn: { position: 'fixed', bottom: 20, right: 20, width: 60, height: 60, borderRadius: '50%', background: '#FF4D1C', color: '#fff', border: 'none', fontSize: 24, cursor: 'pointer', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
    box: { position: 'fixed', bottom: 20, right: 20, width: 350, height: 500, background: '#1D2231', borderRadius: 12, border: '1px solid #333', zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' },
    header: { padding: 15, borderBottom: '1px solid #333', color: '#fff', display: 'flex', justifyContent: 'space-between' },
    list: { flex: 1, padding: 15, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
    inputRow: { padding: 10, borderTop: '1px solid #333', display: 'flex', gap: 8 },
    input: { flex: 1, padding: 8, borderRadius: 4, border: 'none', background: '#333', color: '#fff' },
    sendBtn: { padding: '0 12px', background: '#FF4D1C', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    msg: (role) => ({ alignSelf: role === 'user' ? 'flex-end' : 'flex-start', background: role === 'user' ? '#FF4D1C' : '#333', padding: '8px 12px', borderRadius: 8, maxWidth: '85%', color: '#fff', fontSize: 13, lineHeight: 1.5 })
  };

  if (!isOpen) return <button style={styles.btn} onClick={() => setIsOpen(true)}>💬</button>;

  return (
    <div style={styles.box}>
      <div style={styles.header}>
        <span>AI 顾问</span>
        <button onClick={() => setIsOpen(false)} style={{background:'none',border:'none',color:'#fff',cursor:'pointer'}}>×</button>
      </div>
      <div style={styles.list}>
        {messages.map((m, i) => <div key={i} style={styles.msg(m.role)}>{m.content}</div>)}
        {loading && <div style={{color:'#aaa',fontSize:12}}>DeepSeek 思考中...</div>}
        <div ref={endRef} />
      </div>
      <div style={styles.inputRow}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} style={styles.input} placeholder="问我..." />
        <button onClick={send} style={styles.sendBtn}>发送</button>
      </div>
    </div>
  );
}

// --- 辅助函数 ---
function parseVideoPageLink(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("bilibili")) return { platform: "bilibili", name: "哔哩哔哩" };
    return { platform: "web", name: "网页视频" };
  } catch(e) { return null; }
}

// --- 主程序 ---
function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // 模拟分析函数 (保留你原有的逻辑框架)
  const handleAnalyze = () => {
    if (!sourceFile) return alert("请先选择视频");
    setAnalyzing(true);
    // 模拟 2 秒后出结果
    setTimeout(() => {
      setAnalysisResult({ 
        duration: 120, 
        avgShotLength: 3.5, 
        pace: "medium", 
        shots: [{start:0, end:5}, {start:5, end:10}] 
      });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05060A", color: "#fff", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 800, width: "100%" }}>
        <h1>CutLens AI 视频分析</h1>
        
        <div style={{ background: "#111", padding: 20, borderRadius: 10, marginBottom: 20 }}>
          <h3>1. 上传视频</h3>
          <input type="file" onChange={e => setSourceFile(e.target.files[0])} accept="video/*" />
          <div style={{ marginTop: 10 }}>
            <button onClick={handleAnalyze} style={{ padding: "10px 20px", background: "#FF4D1C", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
              {analyzing ? "分析中..." : "开始分析"}
            </button>
          </div>
        </div>

        {analysisResult && (
          <div style={{ background: "#161b22", padding: 20, borderRadius: 10 }}>
            <h3>分析结果</h3>
            <p>风格：{analysisResult.pace}</p>
            <p>镜头数：{analysisResult.shots.length}</p>
          </div>
        )}
      </div>

      {/* ★ 聊天窗口在这里 ★ */}
      <ChatWidget videoContext={analysisResult} />
    </div>
  );
}

export default App;
