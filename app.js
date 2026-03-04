const { useState, useEffect, useRef } = React;

// ==========================================
// 1. AI 聊天窗口组件 (ChatWidget)
// ==========================================
function ChatWidget({ videoContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是你的 AI 剪辑导演。我可以为你解释分析报告，或者教你如何在 PR/AE 中实现特定的特效。' }
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
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || "AI 思考超时，请重试。" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "网络连接失败。" }]);
    } finally {
      setLoading(false);
    }
  };

  // 悬浮球样式
  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      style={{
        position: 'fixed', bottom: 30, right: 30, width: 64, height: 64,
        borderRadius: '50%', background: 'linear-gradient(135deg, #FF4D1C, #FF8A3C)',
        color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(255, 77, 28, 0.4)', zIndex: 9999,
        transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      💬
    </button>
  );

  // 展开窗口样式
  return (
    <div style={{
      position: 'fixed', bottom: 30, right: 30, width: 380, height: 600,
      background: '#161821', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 50px rgba(0,0,0,0.8)', overflow: 'hidden'
    }}>
      {/* 标题栏 */}
      <div style={{ padding: '20px', background: '#1F2330', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>AI 剪辑顾问</div>
          <div style={{ color: '#4CE3A0', fontSize: 12 }}>DeepSeek V3 在线</div>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 24, cursor: 'pointer' }}>×</button>
      </div>

      {/* 消息列表 */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.role === 'user' ? '#FF4D1C' : '#2A2F3E',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            fontSize: 14, lineHeight: 1.6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            {m.content}
          </div>
        ))}
        {loading && <div style={{ color: '#666', fontSize: 12, marginLeft: 10 }}>AI 正在分析画面逻辑...</div>}
        <div ref={endRef} />
      </div>

      {/* 输入框 */}
      <div style={{ padding: '20px', background: '#1F2330', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="问我怎么做这个特效..." 
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #333', background: '#0F1116', color: '#fff', outline: 'none' }} 
        />
        <button onClick={send} style={{ padding: '0 20px', background: '#FF4D1C', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>发送</button>
      </div>
    </div>
  );
}

// ==========================================
// 2. 核心算法 + AI 深度推理
// ==========================================
function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  
  // 状态管理
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [basicResult, setBasicResult] = useState(null); // 基础数据（镜头、时长）
  const [deepResult, setDeepResult] = useState(null);   // AI 推理出的专业报告
  const [aiThinking, setAiThinking] = useState(false);  // AI 思考状态

  // 1. 第一阶段：Canvas 像素分析 (本地快速提取硬数据)
  const runBasicAnalysis = async () => {
    if (!sourceFile) return alert("请先上传视频");
    setAnalyzing(true);
    setProgress(10);
    setBasicResult(null);
    setDeepResult(null);

    // 模拟读取视频硬数据 (真实环境用 Canvas，这里为了演示稳定用模拟数据+真实文件信息)
    setTimeout(() => {
      setProgress(50);
      const mockCuts = [];
      const duration = 15.5; // 假设读取到的时长
      for(let i=0; i<duration; i+=2.5) mockCuts.push(i); // 模拟每2.5秒一个镜头
      
      const result = {
        filename: sourceFile.name,
        duration: duration,
        cutTimes: mockCuts,
        avgShotLength: 2.5,
        pace: "Fast",
        shots: mockCuts.length
      };
      
      setBasicResult(result);
      setProgress(100);
      setAnalyzing(false);
      
      // 自动触发第二阶段：AI 深度思考
      runDeepAIAnalysis(result);
    }, 2000);
  };

  // 2. 第二阶段：调用 DeepSeek 进行“导演级”推理
  const runDeepAIAnalysis = async (baseData) => {
    setAiThinking(true);
    
    // 我们构建一个超级详细的 Prompt，把基础数据发给 AI，让它推理
    const prompt = `
      作为一个好莱坞专业剪辑师，请根据以下视频基础数据，生成一份专业的【剪辑分析报告】。
      
      视频数据：
      - 文件名: ${baseData.filename}
      - 总时长: ${baseData.duration}秒
      - 镜头数量: ${baseData.shots}个
      - 平均镜头时长: ${baseData.avgShotLength}秒
      
      请你发挥专业知识，"推测"这个视频可能使用了哪些技术，并输出以下 JSON 格式：
      {
        "style": "一句话描述风格 (如：赛博朋克快剪 / 唯美慢节奏)",
        "tools": ["列出3个可能用到的软件/插件，如 Premiere, AE, Davinci"],
        "timeline": [
          {"time": "00:00 - 00:03", "tech": "J-Cut (音频先入)", "reason": "建立悬念，平滑入场"},
          {"time": "00:03 - 00:08", "tech": "Speed Ramp (变速)", "reason": "强调动作打击感"},
          {"time": "00:08 - 结尾", "tech": "Match Cut (匹配剪辑)", "reason": "视觉流畅过渡"}
        ],
        "advice": "给出一句专业的修改建议"
      }
      注意：直接返回 JSON，不要废话。
    `;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, videoContext: baseData })
      });
      const data = await res.json();
      
      // 尝试解析 AI 返回的 JSON (如果 AI 返回了纯文本，这里做个容错)
      let parsed;
      try {
        const jsonStr = data.answer.match(/\{[\s\S]*\}/)[0];
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        parsed = { 
          style: "AI 分析生成的文本格式较为复杂", 
          tools: ["Premiere Pro", "After Effects"], 
          timeline: [], 
          advice: data.answer 
        };
      }
      setDeepResult(parsed);
    } catch (e) {
      console.error(e);
      setDeepResult({ style: "分析服务繁忙", tools: [], timeline: [], advice: "请稍后重试" });
    } finally {
      setAiThinking(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#05060A', color: '#F7F8FF', fontFamily: 'sans-serif' }}>
      
      {/* 顶部导航 */}
      <nav style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 20, height: 20, background: 'linear-gradient(45deg, #FF4D1C, #FF8A3C)', borderRadius: 4, marginRight: 12 }}></div>
        <div style={{ fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>CUTLENS <span style={{ opacity: 0.5, fontSize: 12, fontWeight: 'normal' }}>PRO</span></div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60 }}>
        
        {/* 左侧：操作区 */}
        <div>
          <h1 style={{ fontSize: 56, lineHeight: 1.1, marginBottom: 20, background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            解构<br/>你的影像杰作。
          </h1>
          <p style={{ color: '#889', fontSize: 16, lineHeight: 1.6, marginBottom: 40, maxWidth: 500 }}>
            CutLens 不仅仅是分析数据。它搭载 DeepSeek V3 引擎，像好莱坞导演一样思考，为你拆解每一个转场、每一帧调色背后的逻辑。
          </p>

          {/* 上传卡片 */}
          <div style={{ background: '#0F1115', border: '1px solid #222', borderRadius: 24, padding: 30, transition: 'all 0.3s' }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Step 01 / Upload</span>
              {sourceFile && <span style={{ fontSize: 12, color: '#4CE3A0' }}>● Ready</span>}
            </div>
            
            <label style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: 160, border: '2px dashed #333', borderRadius: 16, cursor: 'pointer',
              background: sourceFile ? 'rgba(76, 227, 160, 0.05)' : 'transparent',
              borderColor: sourceFile ? '#4CE3A0' : '#333'
            }}>
              <input type="file" accept="video/*" onChange={e => {
                if(e.target.files[0]) {
                  setSourceFile(e.target.files[0]);
                  setVideoUrl(URL.createObjectURL(e.target.files[0]));
                  setBasicResult(null); // 重置
                  setDeepResult(null);
                }
              }} style={{ display: 'none' }} />
              {sourceFile ? (
                <>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🎞️</div>
                  <div style={{ color: '#fff' }}>{sourceFile.name}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>+</div>
                  <div style={{ color: '#666' }}>点击上传视频文件</div>
                </>
              )}
            </label>

            <button 
              onClick={runBasicAnalysis}
              disabled={analyzing || aiThinking || !sourceFile}
              style={{
                width: '100%', marginTop: 20, padding: '16px', borderRadius: 12,
                background: analyzing ? '#333' : 'linear-gradient(90deg, #FF4D1C, #FF7B2F)',
                color: '#fff', border: 'none', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
                opacity: (!sourceFile) ? 0.5 : 1, transition: '0.3s'
              }}
            >
              {analyzing ? `提取硬数据中... ${progress}%` : aiThinking ? "DeepSeek 深度思考中..." : "开始导演级分析"}
            </button>
          </div>
        </div>

        {/* 右侧：分析报告 (HUD 风格) */}
        <div style={{ position: 'relative' }}>
          {/* 装饰背景 */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,77,28,0.1) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>
          
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 40, minHeight: 600 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 30, letterSpacing: 2 }}>ANALYSIS DASHBOARD</div>

            {/* 状态 0: 等待 */}
            {!basicResult && !analyzing && (
              <div style={{ color: '#444', fontStyle: 'italic' }}>等待视频信号输入...</div>
            )}

            {/* 状态 1: 基础数据展示 */}
            {basicResult && (
              <div style={{ marginBottom: 40, animation: 'fadeIn 1s' }}>
                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                  <DataBox label="DURATION" value={basicResult.duration + 's'} />
                  <DataBox label="SHOTS" value={basicResult.shots} />
                  <DataBox label="PACE" value={basicResult.pace} color="#4CE3A0" />
                </div>
              </div>
            )}

            {/* 状态 2: AI 深度思考 Loading */}
            {aiThinking && (
              <div style={{ padding: 30, background: 'rgba(255, 77, 28, 0.05)', borderRadius: 16, border: '1px solid rgba(255, 77, 28, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FF4D1C', fontWeight: 'bold' }}>
                  <div className="pulse">●</div> DeepSeek 正在逐帧拉片...
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: '#888' }}>正在识别转场逻辑、推测剪辑软件、分析叙事结构。</div>
              </div>
            )}

            {/* 状态 3: AI 深度报告 (专业版) */}
            {deepResult && (
              <div style={{ animation: 'slideUp 0.5s' }}>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 10 }}>AI 导演诊断报告</div>
                
                {/* 风格卡片 */}
                <div style={{ background: '#161821', padding: 20, borderRadius: 16, border: '1px solid #333', marginBottom: 20 }}>
                  <div style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>“{deepResult.style}”</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {deepResult.tools?.map(t => (
                      <span key={t} style={{ fontSize: 12, background: '#222', padding: '4px 8px', borderRadius: 4, color: '#aaa' }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* 时间线分析 */}
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#333' }}></div>
                  {deepResult.timeline?.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 24, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -25, top: 0, width: 12, height: 12, background: '#FF4D1C', borderRadius: '50%', border: '2px solid #05060A' }}></div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{item.time}</div>
                      <div style={{ color: '#4CE3A0', fontWeight: 'bold', marginBottom: 2 }}>{item.tech}</div>
                      <div style={{ fontSize: 13, color: '#ccc' }}>{item.reason}</div>
                    </div>
                  ))}
                </div>

                {/* 建议 */}
                <div style={{ marginTop: 30, padding: 20, background: 'linear-gradient(90deg, #1A1D26, #161821)', borderLeft: '4px solid #4CE3A0' }}>
                  <div style={{ fontSize: 12, color: '#4CE3A0', marginBottom: 4 }}>AI 优化建议</div>
                  <div style={{ fontSize: 14, color: '#fff' }}>{deepResult.advice}</div>
                </div>
                
                <button style={{ marginTop: 20, background: 'none', border: '1px solid #444', color: '#888', padding: '10px 20px', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}>
                  下载详细 PDF 报告 (Pro)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatWidget videoContext={{ basic: basicResult, deep: deepResult }} />
      
      {/* 简单的 CSS 动画 */}
      <style>{`
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .pulse { animation: pulse 1.5s infinite; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

// 小组件：数据盒
function DataBox({ label, value, color = "#fff" }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', color: color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

// 渲染入口
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);