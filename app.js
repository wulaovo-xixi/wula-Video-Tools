const { useState, useEffect, useRef } = React;

// ==========================================
// 1. 聊天窗口组件 (悬浮球 + 磨砂面板)
// ==========================================
function ChatWidget({ videoContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是 DeepSeek 剪辑导演。我已经准备好分析你的素材，或者教你如何在 PR/AE 中实现特定的特效。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isOpen]);

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
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || "AI 思考超时" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "网络连接失败，请检查 API Key。" }]);
    } finally {
      setLoading(false);
    }
  };

  // 悬浮球样式
  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      style={{
        position: 'fixed', bottom: 40, right: 40, width: 70, height: 70,
        borderRadius: '50%', background: 'linear-gradient(135deg, #FF4D1C, #FF8A3C)',
        color: '#fff', border: 'none', fontSize: 32, cursor: 'pointer',
        boxShadow: '0 0 30px rgba(255, 77, 28, 0.5)', zIndex: 9999,
        transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      🤖
    </button>
  );

  // 展开面板
  return (
    <div style={{
      position: 'fixed', bottom: 40, right: 40, width: 400, height: 650,
      background: 'rgba(22, 24, 33, 0.95)', backdropFilter: 'blur(20px)',
      borderRadius: 24, border: '1px solid rgba(255,77,28,0.2)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      boxShadow: '0 40px 80px rgba(0,0,0,0.8)', animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>AI 剪辑顾问</span>
          <div style={{ fontSize: 10, color: '#4CE3A0', marginTop: 4 }}>● DeepSeek V3 在线</div>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background:'none', border:'none', color:'#888', fontSize: 24, cursor:'pointer' }}>×</button>
      </div>
      <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.role === 'user' ? 'linear-gradient(135deg, #FF4D1C, #FF7B2F)' : '#2A2F3E',
            padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.5, color: '#fff'
          }}>{m.content}</div>
        ))}
        {loading && <div style={{ color: '#888', fontSize: 12, fontStyle: 'italic' }}>DeepSeek 正在思考...</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 10 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#0F1116', color: '#fff' }} placeholder="输入问题..." />
        <button onClick={send} style={{ padding: '0 20px', background: '#FF4D1C', color: '#fff', border: 'none', borderRadius: 8, cursor:'pointer', fontWeight: 'bold' }}>发送</button>
      </div>
    </div>
  );
}

// ==========================================
// 2. 主程序 (DeepSeek 深度分析)
// ==========================================
function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiState, setAiState] = useState(""); 
  
  const [basicData, setBasicData] = useState(null);
  const [deepResult, setDeepResult] = useState(null);

  const startAnalysis = async () => {
    if (!sourceFile) return;
    setAnalyzing(true);
    setBasicData(null);
    setDeepResult(null);
    
    // 阶段一：模拟本地提取数据
    setAiState("正在提取视频元数据...");
    let p = 0;
    const timer = setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        clearInterval(timer);
        finishBasicAnalysis();
      }
    }, 200);
  };

  const finishBasicAnalysis = () => {
    const data = {
      filename: sourceFile.name,
      duration: "15.4s",
      shots: 8,
      pace: "Fast (快节奏)",
      avgShot: "1.9s"
    };
    setBasicData(data);
    callDeepSeek(data);
  };

  // ★★★ 核心：调用后端 DeepSeek ★★★
  const callDeepSeek = async (data) => {
    setAiState("DeepSeek V3 正在介入分析...");
    
    const prompt = `
      请扮演好莱坞剪辑师，分析视频数据：${JSON.stringify(data)}。
      推测剪辑手法，必须返回 JSON 格式：
      {
        "style": "风格描述",
        "tools": ["PR工具1", "AE工具2"],
        "timeline": [{"time": "00:00", "tech": "J-Cut", "reason": "原因"}],
        "advice": "建议"
      }
    `;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, videoContext: data })
      });
      const jsonResponse = await res.json();
      
      let parsed;
      try {
        const raw = jsonResponse.answer.replace(/```json/g, '').replace(/```/g, '');
        parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]);
      } catch (e) {
        parsed = { style: "AI 分析完成", tools: [], timeline: [], advice: jsonResponse.answer };
      }
      
      setDeepResult(parsed);
      setAiState("分析完成");
    } catch (e) {
      setAiState("AI 连接失败");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      
      <h1 style={{ fontSize: 48, background: 'linear-gradient(to right, #fff, #999)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: 40 }}>
        CUTLENS PRO <span style={{fontSize:16, color:'#4CE3A0', verticalAlign:'middle'}}>● ONLINE</span>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, width: '100%', maxWidth: 1200 }}>
        
        {/* 左侧：控制台 */}
        <div style={{ animation: 'slideUp 0.5s' }}>
          <div style={{ background: '#0F1115', border: '1px solid #222', borderRadius: 24, padding: 30 }}>
            <div style={{ color: '#666', fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>INPUT SOURCE</div>
            
            <label style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, 
              border: '2px dashed #333', borderRadius: 16, cursor: 'pointer', background: sourceFile ? 'rgba(76,227,160,0.05)' : 'transparent',
              borderColor: sourceFile ? '#4CE3A0' : '#333'
            }}>
              <input type="file" onChange={e => setSourceFile(e.target.files[0])} style={{display:'none'}} accept="video/*" />
              <div style={{ fontSize: 30, marginBottom: 10 }}>{sourceFile ? '🎞️' : '+'}</div>
              <div style={{ color: '#fff' }}>{sourceFile ? sourceFile.name : '点击上传视频'}</div>
            </label>

            <button onClick={startAnalysis} disabled={analyzing || !sourceFile} style={{
              width: '100%', marginTop: 20, padding: 18, borderRadius: 12, border: 'none',
              background: analyzing ? '#333' : 'linear-gradient(90deg, #FF4D1C, #FF7B2F)',
              color: '#fff', fontWeight: 'bold', cursor: sourceFile ? 'pointer' : 'not-allowed',
              boxShadow: analyzing ? 'none' : '0 10px 20px rgba(255,77,28,0.3)'
            }}>
              {analyzing ? aiState : "开始导演级分析"}
            </button>
          </div>
        </div>

        {/* 右侧：分析结果 HUD */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, #fff, transparent)', opacity: 0.1 }}></div>
          <div style={{ paddingLeft: 40 }}>
            <div style={{ color: '#666', fontSize: 12, letterSpacing: 2, marginBottom: 30, fontWeight: 'bold' }}>ANALYSIS DASHBOARD</div>
            
            {basicData && (
              <div style={{ display: 'flex', gap: 20, marginBottom: 30, animation: 'slideUp 0.5s' }}>
                <DataCard label="DURATION" val={basicData.duration} />
                <DataCard label="SHOTS" val={basicData.shots} />
                <DataCard label="PACE" val={basicData.pace} color="#4CE3A0" />
              </div>
            )}

            {analyzing && progress === 100 && (
              <div style={{ padding: 20, background: 'rgba(255,77,28,0.1)', borderRadius: 12, border: '1px solid #FF4D1C', color: '#FF4D1C', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ animation: 'pulse 1s infinite' }}>●</span> {aiState}
              </div>
            )}

            {deepResult && (
              <div style={{ animation: 'slideUp 0.5s' }}>
                <div style={{ background: '#161821', padding: 24, borderRadius: 16, border: '1px solid #333', marginBottom: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>“{deepResult.style}”</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {deepResult.tools?.map((t,i) => <span key={i} style={{fontSize:12, background:'#333', padding:'4px 8px', borderRadius:4, color:'#ccc'}}>{t}</span>)}
                  </div>
                </div>
                <div style={{ borderLeft: '2px solid #333', paddingLeft: 20, marginLeft: 10 }}>
                  {deepResult.timeline?.map((item, i) => (
                    <div key={i} style={{ marginBottom: 20, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -27, top: 5, width: 12, height: 12, background: '#05060A', border: '2px solid #FF4D1C', borderRadius: '50%' }}></div>
                      <div style={{ color: '#FF4D1C', fontWeight: 'bold', fontSize: 14 }}>{item.time}</div>
                      <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{item.tech}</div>
                      <div style={{ color: '#888', fontSize: 14 }}>{item.reason}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: 20, background: 'rgba(76,227,160,0.05)', borderLeft: '4px solid #4CE3A0', color: '#ddd' }}>
                  {deepResult.advice}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatWidget videoContext={{ basic: basicData, deep: deepResult }} />
    </div>
  );
}

function DataCard({ label, val, color="#fff" }) {
  return (
    <div style={{ background: '#0F1115', padding: 16, borderRadius: 12, border: '1px solid #222', flex: 1 }}>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 5, fontWeight: 'bold' }}>{label}</div>
      <div style={{ fontSize: 24, color: color, fontWeight: 'bold', fontFamily: 'monospace' }}>{val}</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);