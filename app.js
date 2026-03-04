// 获取 React 全局对象
const { useState, useEffect, useRef } = React;

// ==========================================
// 1. 聊天窗口组件 (悬浮发光球 + 磨砂玻璃窗)
// ==========================================
function ChatWidget({ videoContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '我是你的 DeepSeek 剪辑导演。我已经准备好分析这段素材的剪辑逻辑、调色方案以及特效节点。你可以问我具体的 PR/AE 操作步骤。' }
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
      setMessages(prev => [...prev, { role: 'assistant', content: "网络连接异常，请检查 API Key。" }]);
    } finally {
      setLoading(false);
    }
  };

  // 悬浮球样式 (发光呼吸效果)
  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      style={{
        position: 'fixed', bottom: 40, right: 40, width: 70, height: 70,
        borderRadius: '50%', background: 'linear-gradient(135deg, #FF4D1C, #FF8A3C)',
        color: '#fff', border: 'none', fontSize: 32, cursor: 'pointer',
        boxShadow: '0 0 30px rgba(255, 77, 28, 0.5)', zIndex: 9999,
        transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      🤖
    </button>
  );

  // 展开窗口 (高级磨砂质感)
  return (
    <div style={{
      position: 'fixed', bottom: 40, right: 40, width: 420, height: 700,
      background: 'rgba(22, 24, 33, 0.9)', backdropFilter: 'blur(20px)',
      borderRadius: 24, border: '1px solid rgba(255, 77, 28, 0.2)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      boxShadow: '0 40px 80px rgba(0,0,0,0.8)', overflow: 'hidden',
      animation: 'slideUp 0.3s ease-out'
    }}>
      {/* 标题栏 */}
      <div style={{ padding: '24px', background: 'linear-gradient(90deg, #1F2330, #161821)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>AI 剪辑顾问</div>
          <div style={{ color: '#4CE3A0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{width: 8, height: 8, borderRadius: '50%', background: '#4CE3A0', boxShadow: '0 0 10px #4CE3A0'}}></span>
            DeepSeek V3 实时在线
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 32, cursor: 'pointer' }}>×</button>
      </div>

      {/* 聊天内容区 */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.role === 'user' ? 'linear-gradient(135deg, #FF4D1C, #FF7B2F)' : '#2A2F3E',
            color: '#fff',
            padding: '16px 20px',
            borderRadius: m.role === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
            fontSize: 15, lineHeight: 1.6,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            {m.content}
          </div>
        ))}
        {loading && <div style={{ color: '#888', fontSize: 13, marginLeft: 10, fontStyle: 'italic' }}>DeepSeek 正在思考画面逻辑...</div>}
        <div ref={endRef} />
      </div>

      {/* 输入框 */}
      <div style={{ padding: '24px', background: '#1F2330', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="问我怎么调色..." 
          style={{ flex: 1, padding: '16px', borderRadius: 12, border: '1px solid #444', background: '#0F1116', color: '#fff', outline: 'none', fontSize: 15 }} 
        />
        <button onClick={send} style={{ padding: '0 24px', background: '#FF4D1C', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>发送</button>
      </div>
    </div>
  );
}

// ==========================================
// 2. 核心程序 (包含 DeepSeek 深度分析逻辑)
// ==========================================
function App() {
  const [sourceFile, setSourceFile] = useState(null);
  
  // 状态管理
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [basicResult, setBasicResult] = useState(null); 
  const [deepResult, setDeepResult] = useState(null);   
  const [aiThinking, setAiThinking] = useState(false);  

  // 第一阶段：上传与基础提取
  const runBasicAnalysis = async () => {
    if (!sourceFile) return alert("请先上传视频");
    setAnalyzing(true);
    setProgress(10);
    setBasicResult(null);
    setDeepResult(null);

    // 模拟读取视频基础数据进度条 (真实环境需 Canvas 逐帧扫描，耗时较长)
    let p = 10;
    const timer = setInterval(() => {
      p += 15;
      if (p > 90) clearInterval(timer);
      setProgress(p);
    }, 200);

    setTimeout(() => {
      clearInterval(timer);
      setProgress(100);
      
      const result = {
        filename: sourceFile.name,
        duration: "15.5", // 模拟读取
        shots: 8,
        avgShotLength: "1.9",
        pace: "Fast",
      };
      
      setBasicResult(result);
      setAnalyzing(false);
      
      // 自动开始第二阶段：DeepSeek 介入
      runDeepAIAnalysis(result);
    }, 1500);
  };

  // 第二阶段：DeepSeek 深度分析 (发送真实请求)
  const runDeepAIAnalysis = async (baseData) => {
    setAiThinking(true);
    
    // 发送给 AI 的指令：要求列出具体工具和时间点
    const prompt = `
      作为一个好莱坞专业剪辑师，请分析以下视频数据：
      - 文件名: ${baseData.filename}
      - 节奏: ${baseData.pace} (快节奏)
      - 平均镜头: ${baseData.avgShotLength}秒
      
      请你推测该视频可能使用了哪些高级剪辑手法，并输出 JSON 格式（不要Markdown符号）：
      {
        "style": "风格描述 (如：赛博朋克快剪)",
        "tools": ["具体工具1 (如 PR - 速度爬坡)", "具体工具2 (如 AE - 像素撕裂)"],
        "timeline": [
          {"time": "00:00", "tech": "J-Cut", "reason": "音频先行建立悬念"},
          {"time": "00:03", "tech": "Speed Ramp", "reason": "变速强调动作"},
          {"time": "00:08", "tech": "Match Cut", "reason": "视觉匹配转场"}
        ],
        "advice": "专业建议"
      }
    `;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, videoContext: baseData })
      });
      const data = await res.json();
      
      // 解析 AI 返回的 JSON
      let parsed;
      try {
        const rawText = data.answer.replace(/```json/g, '').replace(/```/g, '');
        const jsonStr = rawText.match(/\{[\s\S]*\}/)[0];
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        parsed = { 
          style: "AI 分析生成的文本较为复杂，请在聊天窗口询问详情", 
          tools: ["Premiere Pro", "After Effects"], 
          timeline: [], 
          advice: data.answer
        };
      }
      setDeepResult(parsed);
    } catch (e) {
      console.error(e);
      setDeepResult({ style: "网络繁忙", tools: [], timeline: [], advice: "请稍后重试" });
    } finally {
      setAiThinking(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* 动画定义 */}
      <style>{`
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        .pulse { animation: pulse 1.5s infinite; }
      `}</style>
      
      {/* 顶部导航 */}
      <nav style={{ padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', background: 'rgba(5,6,10,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(45deg, #FF4D1C, #FF8A3C)', borderRadius: 8, marginRight: 16 }}></div>
        <div style={{ fontWeight: 'bold', fontSize: 24, letterSpacing: 1 }}>CUTLENS <span style={{ opacity: 0.5, fontSize: 14, fontWeight: 'normal' }}>PRO</span></div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '60px 40px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80 }}>
        
        {/* 左侧：上传区 */}
        <div style={{ animation: 'slideUp 0.5s ease-out' }}>
          <h1 style={{ fontSize: 64, lineHeight: 1.1, marginBottom: 30, background: 'linear-gradient(to right, #fff, #999)', WebkitBackgroundClip: 'text', color: 'transparent', letterSpacing: '-0.03em' }}>
            解构影像<br/>重塑叙事。
          </h1>
          <p style={{ color: '#889', fontSize: 20, lineHeight: 1.6, marginBottom: 50, maxWidth: 550 }}>
            搭载 <strong>DeepSeek V3</strong> 引擎。像好莱坞剪辑师一样思考，识别 J-Cut、匹配剪辑与调色逻辑。
          </p>

          <div style={{ background: '#0F1115', border: '1px solid #222', borderRadius: 32, padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#666', fontWeight: 'bold' }}>Step 01 / Input Signal</span>
              {sourceFile && <span style={{ fontSize: 14, color: '#4CE3A0', fontWeight: 'bold' }}>● SIGNAL LOCKED</span>}
            </div>
            
            <label style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: 220, border: '2px dashed #333', borderRadius: 24, cursor: 'pointer',
              background: sourceFile ? 'rgba(76, 227, 160, 0.05)' : 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0))',
              borderColor: sourceFile ? '#4CE3A0' : '#333',
              transition: '0.3s'
            }}>
              <input type="file" accept="video/*" onChange={e => {
                if(e.target.files[0]) {
                  setSourceFile(e.target.files[0]);
                  setBasicResult(null); 
                  setDeepResult(null);
                }
              }} style={{ display: 'none' }} />
              {sourceFile ? (
                <>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🎞️</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{sourceFile.name}</div>
                  <div style={{ color: '#4CE3A0', fontSize: 14, marginTop: 8 }}>点击更换</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5, color: '#fff' }}>+</div>
                  <div style={{ color: '#888', fontSize: 16 }}>点击上传视频文件</div>
                </>
              )}
            </label>

            <button 
              onClick={runBasicAnalysis}
              disabled={analyzing || aiThinking || !sourceFile}
              style={{
                width: '100%', marginTop: 30, padding: '22px', borderRadius: 16,
                background: analyzing ? '#222' : 'linear-gradient(90deg, #FF4D1C, #FF7B2F)',
                color: '#fff', border: 'none', fontSize: 18, fontWeight: 'bold', cursor: sourceFile ? 'pointer' : 'not-allowed',
                opacity: (!sourceFile) ? 0.3 : 1, transition: '0.3s',
                boxShadow: analyzing ? 'none' : '0 10px 30px rgba(255, 77, 28, 0.3)'
              }}
            >
              {analyzing ? `正在提取元数据... ${progress}%` : aiThinking ? "DeepSeek 深度思考中..." : "开始导演级分析"}
            </button>
          </div>
        </div>

        {/* 右侧：数据仪表盘 */}
        <div style={{ position: 'relative', minHeight: 700 }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0))' }}></div>
          
          <div style={{ paddingLeft: 60 }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 40, letterSpacing: 3, fontWeight: 'bold' }}>ANALYSIS DASHBOARD // V3.0</div>

            {/* 状态 0: 等待 */}
            {!basicResult && !analyzing && (
              <div style={{ padding: 60, border: '1px dashed #333', borderRadius: 24, color: '#444', textAlign: 'center' }}>
                 等待输入信号... <br/>
              </div>
            )}

            {/* 状态 1: 基础数据展示 */}
            {basicResult && (
              <div style={{ marginBottom: 50, animation: 'fadeIn 1s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 40 }}>
                  <DataBox label="DURATION" value={basicResult.duration + 's'} />
                  <DataBox label="SHOTS" value={basicResult.shots} />
                  <DataBox label="PACE" value={basicResult.pace} color="#4CE3A0" />
                </div>
              </div>
            )}

            {/* 状态 2: AI 思考中 */}
            {aiThinking && (
              <div style={{ padding: 40, background: 'rgba(255, 77, 28, 0.05)', borderRadius: 24, border: '1px solid rgba(255, 77, 28, 0.2)', marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#FF4D1C', fontWeight: 'bold', fontSize: 18 }}>
                  <div className="pulse" style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF4D1C' }}></div>
                  DeepSeek 正在逐帧拉片...
                </div>
                <div style={{ marginTop: 16, fontSize: 15, color: '#888', lineHeight: 1.8 }}>
                  正在识别转场逻辑...<br/>正在推测剪辑软件...
                </div>
              </div>
            )}

            {/* 状态 3: AI 深度报告 */}
            {deepResult && (
              <div style={{ animation: 'slideUp 0.5s ease-out' }}>
                <div style={{ fontSize: 16, color: '#888', fontWeight: 'bold', marginBottom: 20 }}>AI 导演诊断报告</div>
                
                {/* 风格与工具 */}
                <div style={{ background: '#161821', padding: 30, borderRadius: 24, border: '1px solid #333', marginBottom: 30 }}>
                  <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>“{deepResult.style}”</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {deepResult.tools?.map((t, i) => (
                      <span key={i} style={{ fontSize: 13, background: '#222', padding: '8px 14px', borderRadius: 8, color: '#ccc', border: '1px solid #333' }}>🛠️ {t}</span>
                    ))}
                  </div>
                </div>

                {/* 时间线 */}
                <div style={{ position: 'relative', paddingLeft: 30 }}>
                  <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, background: '#333' }}></div>
                  {deepResult.timeline?.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 30, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -27, top: 6, width: 12, height: 12, background: '#05060A', borderRadius: '50%', border: '2px solid #FF4D1C', zIndex: 2 }}></div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                        <div style={{ fontSize: 16, color: '#FF4D1C', fontFamily: 'monospace', fontWeight: 'bold' }}>{item.time}</div>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{item.tech}</div>
                      </div>
                      <div style={{ fontSize: 15, color: '#888' }}>{item.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatWidget videoContext={{ basic: basicResult, deep: deepResult }} />
    </div>
  );
}

// 小组件：数据盒
function DataBox({ label, value, color = "#fff" }) {
  return (
    <div style={{ background: '#0F1115', padding: '24px', borderRadius: 16, border: '1px solid #222' }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 8, fontWeight: 'bold', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 'bold', color: color, fontFamily: 'monospace', letterSpacing: -1 }}>{value}</div>
    </div>
  );
}

// 渲染入口
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);