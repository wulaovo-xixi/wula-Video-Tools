// --- 获取 React 全局对象 ---
const { useState, useEffect, useRef } = React;

// --- 1. 聊天组件 ---
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
      setMessages(prev => [...prev, { role: 'assistant', content: "发送失败，请检查 Vercel 环境变量配置。" }]);
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

// --- 2. 主程序 ---
function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // 简单的文件分析模拟逻辑
  const handleAnalyze = () => {
    if (!sourceFile) return alert("请先选择视频文件");
    setAnalyzing(true);
    // 模拟 1.5秒后出结果
    setTimeout(() => {
      setAnalysisResult({ 
        filename: sourceFile.name,
        duration: "02:30", 
        style: "快节奏 Vlog",
        details: "检测到大量快速剪辑和跳接。"
      });
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      {/* 标题区 */}
      <div style={{ textAlign: "center", marginBottom: 40, marginTop: 40 }}>
        <h1 style={{ fontSize: 48, background: "linear-gradient(90deg, #FFB341, #FF4D1C)", WebkitBackgroundClip: "text", color: "transparent", margin: "0 0 10px 0" }}>
          AI 导演级剪辑分析
        </h1>
        <p style={{ color: "#889" }}>上传视频，一键拆解镜头节奏 (DeepSeek 驱动)</p>
      </div>

      {/* 操作区 */}
      <div style={{ background: "#111", padding: 30, borderRadius: 16, border: "1px solid #222" }}>
        <h3 style={{ marginTop: 0 }}>第一步：上传视频</h3>
        <input type="file" onChange={e => setSourceFile(e.target.files[0])} accept="video/*" style={{ color: "#ccc" }} />
        
        <div style={{ marginTop: 20 }}>
          <button onClick={handleAnalyze} disabled={analyzing} style={{ padding: "12px 24px", background: "#FF4D1C", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: "bold", opacity: analyzing ? 0.7 : 1 }}>
            {analyzing ? "正在分析中..." : "开始分析剪辑手法"}
          </button>
        </div>
      </div>

      {/* 结果区 */}
      {analysisResult && (
        <div style={{ marginTop: 20, background: "#161b22", padding: 30, borderRadius: 16, border: "1px solid #333" }}>
          <h3 style={{ marginTop: 0, color: "#4CE3A0" }}>分析完成 ✅</h3>
          <p><strong>视频文件：</strong> {analysisResult.filename}</p>
          <p><strong>剪辑风格：</strong> {analysisResult.style}</p>
          <p><strong>详细诊断：</strong> {analysisResult.details}</p>
        </div>
      )}

      {/* 聊天窗口组件 */}
      <ChatWidget videoContext={analysisResult} />
    </div>
  );
}

// --- 3. 启动应用 (这是最关键的一步) ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);