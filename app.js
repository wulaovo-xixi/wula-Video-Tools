import React, { useState, useEffect, useRef } from 'react';

// --- 1. 这里是聊天窗口组件 (直接集成在里面) ---
function ChatWidget({ videoContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是 DeepSeek 驱动的 AI 剪辑顾问。关于这个视频的剪辑手法、特效或 PR/AE 操作，你可以随时问我。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 调用我们在 api/chat.js 里写的 DeepSeek 接口
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, videoContext })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || "抱歉，AI 暂时无法回答。" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "网络错误，请检查 Vercel 环境变量是否配置了 DEEPSEEK_API_KEY。" }]);
    } finally {
      setLoading(false);
    }
  };

  // 聊天窗口样式
  const styles = {
    container: { position: 'fixed', bottom: 20, right: 20, zIndex: 9999, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    bubble: { width: 60, height: 60, borderRadius: '50%', background: '#FF4D1C', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 77, 28, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    window: { width: 360, height: 520, background: '#1D2231', borderRadius: 16, display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', overflow: 'hidden' },
    header: { padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    body: { flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: '#151925' },
    footer: { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 10, background: '#1D2231' },
    input: { flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none' },
    btn: { padding: '8px 16px', borderRadius: 20, background: '#FF4D1C', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' },
    msgBase: { maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' },
    userMsg: { alignSelf: 'flex-end', background: '#FF4D1C', color: '#fff', borderBottomRightRadius: 2 },
    aiMsg: { alignSelf: 'flex-start', background: '#2A2F3E', color: '#E0E0E0', borderBottomLeftRadius: 2 }
  };

  return (
    <div style={styles.container}>
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} style={styles.bubble}>💬</button>
      ) : (
        <div style={styles.window}>
          <div style={styles.header}>
            <span style={{fontWeight: 600}}>AI 剪辑顾问 (DeepSeek)</span>
            <button onClick={() => setIsOpen(false)} style={{background: 'none', border: 'none', color: '#aaa', fontSize: 24, cursor: 'pointer'}}>×</button>
          </div>
          <div style={styles.body}>
            {messages.map((m, i) => (
              <div key={i} style={{...styles.msgBase, ...(m.role === 'user' ? styles.userMsg : styles.aiMsg)}}>
                {m.content}
              </div>
            ))}
            {loading && <div style={{color: '#666', fontSize: 12, marginLeft: 10}}>正在思考...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div style={styles.footer}>
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="问我怎么剪..." 
              style={styles.input}
            />
            <button onClick={handleSend} style={styles.btn}>发送</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 2. 视频链接解析工具 ---
function parseVideoPageLink(url) {
  const raw = (url || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host.includes("bilibili.com")) {
      const m = raw.match(/\/(BV[\w]{10})/i) || raw.match(/bvid=([\w]{12})/i);
      const bvid = m ? (m[1].toUpperCase().startsWith("BV") ? m[1].toUpperCase().slice(0, 12) : "BV" + m[1]) : null;
      if (bvid) return { platform: "bilibili", name: "哔哩哔哩", embedUrl: "https://player.bilibili.com/player.html?bvid=" + bvid + "&high_quality=1", pageUrl: raw };
    }
    if (host === "b23.tv" || host.endsWith(".b23.tv")) return { platform: "bilibili", name: "哔哩哔哩", embedUrl: null, pageUrl: raw, needRedirect: true };
    if (host.includes("douyin.com") || host.includes("iesdouyin.com")) return { platform: "douyin", name: "抖音", embedUrl: null, pageUrl: raw };
    if (host.includes("kuaishou.com") || host.includes("gifshow.com")) return { platform: "kuaishou", name: "快手", embedUrl: null, pageUrl: raw };
    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) return { platform: "xiaohongshu", name: "小红书", embedUrl: null, pageUrl: raw };
    return { platform: "unknown", name: "网页视频", embedUrl: null, pageUrl: raw };
  } catch (_) { return null; }
}

// --- 3. 主应用程序 ---
function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [targetFiles, setTargetFiles] = useState([]); 

  const [pageLinkInput, setPageLinkInput] = useState("");
  const [linkImport, setLinkImport] = useState(null);
  const [parsingLink, setParsingLink] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [templatePlan, setTemplatePlan] = useState(null);
  const [applyResults, setApplyResults] = useState([]);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      for (const t of targetFiles) { if (t.url) URL.revokeObjectURL(t.url); }
    };
  }, [sourceUrl, targetFiles]);

  const handleSourceChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setAnalysisError("请选择一个视频文件进行分析。");
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
    setAnalysisError("");
    setAnalysisResult(null);
    setTemplatePlan(null);
    setApplyResults([]);
  };

  const handleTargetChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const invalid = files.find((f) => !f.type.startsWith("video/"));
    if (invalid) { setAnalysisError("应用模板时也需要选择视频文件。"); return; }
    setAnalysisError("");
    setApplyResults([]);
    setTargetFiles((prev) => {
      const next = [...prev];
      for (const file of files) {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        next.push({ id, file, url: URL.createObjectURL(file) });
      }
      return next;
    });
    e.target.value = "";
  };

  async function analyzeVideoEditing(file, onProgress) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto"; video.muted = true; video.crossOrigin = "anonymous";
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      const cleanup = () => { URL.revokeObjectURL(objectUrl); };

      video.addEventListener("error", () => { cleanup(); reject(new Error("无法读取该视频")); });

      video.addEventListener("loadedmetadata", async () => {
        if (!video.duration || !isFinite(video.duration)) { cleanup(); reject(new Error("无法获取视频时长")); return; }
        const duration = video.duration;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const targetWidth = 192; const targetHeight = 108;
        canvas.width = targetWidth; canvas.height = targetHeight;
        
        const step = Math.max(0.4, duration / 120);
        const totalSamples = Math.max(1, Math.ceil(duration / step));
        let doneSamples = 0;
        let prevVector = null; const diffs = []; const cutTimes = [0];

        const captureAt = (time) => new Promise((res) => {
            const onSeeked = () => {
              ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
              const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
              const data = imageData.data;
              const vector = []; const stride = 12;
              for (let i = 0; i < data.length; i += stride) vector.push(data[i], data[i + 1], data[i + 2]);
              
              if (prevVector) {
                let diff = 0; const len = Math.min(prevVector.length, vector.length);
                for (let i = 0; i < len; i++) diff += Math.abs(prevVector[i] - vector[i]);
                diffs.push({ time, diff });
              }
              prevVector = vector;
              video.removeEventListener("seeked", onSeeked);
              res();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = Math.min(time, duration - 0.1);
          });

        try {
          for (let t = 0; t < duration; t += step) {
            await captureAt(t);
            doneSamples += 1;
            if (typeof onProgress === "function") onProgress(Math.min(99, Math.round((doneSamples / totalSamples) * 100)));
          }
        } catch (err) { cleanup(); reject(err); return; }
        cleanup();
        if (typeof onProgress === "function") onProgress(100);

        if (!diffs.length) {
          resolve({ duration, shots: [{ start: 0, end: duration }], pace: "slow", avgShotLength: duration, cutCount: 0, description: "长镜头，节奏舒缓。" });
          return;
        }

        const values = diffs.map((d) => d.diff).sort((a, b) => a - b);
        const threshold = (values[Math.floor(values.length * 0.8)] + values[Math.floor(values.length * 0.9)]) / 2 || values[values.length - 1];
        for (const entry of diffs) {
          if (entry.diff >= threshold) {
            if (entry.time - cutTimes[cutTimes.length - 1] > 0.6) cutTimes.push(entry.time);
          }
        }
        if (cutTimes[cutTimes.length - 1] < duration - 0.3) cutTimes.push(duration);

        const shots = [];
        for (let i = 0; i < cutTimes.length - 1; i++) shots.push({ start: cutTimes[i], end: cutTimes[i + 1] });
        
        const shotLengths = shots.map((s) => s.end - s.start);
        const avgShotLength = shotLengths.reduce((sum, v) => sum + v, 0) / shotLengths.length;
        let pace = avgShotLength < 1.8 ? "fast" : (avgShotLength < 3.5 ? "medium" : "slow");
        
        resolve({
          duration, shots, cutCount: shots.length - 1, avgShotLength, pace,
          pattern: shots.map((s) => ({ startRatio: s.start / duration, endRatio: s.end / duration, length: s.end - s.start })),
          description: pace === 'fast' ? "快节奏剪辑" : "节奏适中"
        });
      });
    });
  }

  const handleAnalyze = async () => {
    if (!sourceFile) { setAnalysisError("请先上传一个要分析的源视频。"); return; }
    setAnalyzing(true); setAnalysisProgress(0); setAnalysisError(""); setAnalysisResult(null); setTemplatePlan(null); setApplyResults([]);
    try {
      const result = await analyzeVideoEditing(sourceFile, (p) => setAnalysisProgress(p));
      setAnalysisResult(result);
      setTemplatePlan({
        title: "剪辑节奏模板",
        moodHint: result.pace === "fast" ? "适合快节奏内容" : "适合叙事类内容",
        pace: result.pace,
        avgShotLengthSeconds: Number(result.avgShotLength.toFixed(2)),
        shotCount: result.shots.length,
        structure: result.pattern.map((p, idx) => ({ index: idx + 1, startRatio: Number((p.startRatio * 100).toFixed(1)), endRatio: Number((p.endRatio * 100).toFixed(1)), lengthSeconds: Number(p.length.toFixed(2)) }))
      });
    } catch (err) { console.error(err); setAnalysisError(err.message || "分析失败"); } finally { setAnalyzing(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top left, #1D2231 0, #05060A 52%, #050509 100%)", color: "#F7F8FF", fontFamily: "sans-serif", display: "flex", alignItems: "stretch", justifyContent: "center", padding: "32px 24px 40px" }}>
      <div style={{ width: "100%", maxWidth: 1200, display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.1fr)", gap: 32 }}>
        
        {/* 左侧控制区 */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 11px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(90deg, rgba(255,77,28,0.18), rgba(24,24,32,0.85))", marginBottom: 18 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(248,250,255,0.9)", fontWeight: 500 }}>CutLens · AI 剪辑分析</span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontWeight: 800, fontSize: 48, lineHeight: 1.03, marginBottom: 18, background: "linear-gradient(90deg, #FFB341 0%, #FF4D1C 45%, #FF7B7B 100%)", WebkitBackgroundClip: "text", color: "transparent" }}>
              AI 导演级剪辑分析
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(223,225,240,0.88)", maxWidth: 520 }}>
              上传任意视频，自动拆解镜头节奏。现在支持 DeepSeek 智能问答！
            </p>
          </div>

          {/* 链接输入区 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="text" value={pageLinkInput} onChange={(e) => setPageLinkInput(e.target.value)} placeholder="粘贴 B站 / 抖音 链接" style={{ flex: "1 1 280px", padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(148,163,255,0.28)", background: "rgba(15,23,42,0.85)", color: "#E5EDFF", fontSize: 13, outline: "none" }} />
              <button onClick={async () => {
                  /* 简化的解析逻辑调用 */
                  if(!pageLinkInput) return;
                  setParsingLink(true);
                  try {
                      const res = await fetch('/api/get-video-info', { method: 'POST', body: JSON.stringify({ url: pageLinkInput }) });
                      const data = await res.json();
                      if(data.title) setLinkImport({ ...data, name: data.platform });
                  } catch(e) { alert("解析失败"); } finally { setParsingLink(false); }
              }} style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #5B7FFF 0%, #7F2EFF 100%)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {parsingLink ? "解析中…" : "解析"}
              </button>
            </div>
            {linkImport && (
               <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(15,20,35,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
                   <div style={{fontSize: 14, fontWeight: 'bold'}}>{linkImport.title}</div>
                   <div style={{fontSize: 12, color: '#aaa', marginTop: 4}}>已识别视频信息，请下载后上传以进行深度分析。</div>
               </div>
            )}
          </div>

          {/* 文件上传区 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "rgba(186,194,226,0.95)", marginBottom: 6, fontWeight: 600 }}>手动上传视频分析</div>
            <label style={{ display: "inline-block", background: "linear-gradient(90deg, #FF4D1C, #FF7B2F)", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>
              选择示例视频进行分析
              <input type="file" accept="video/*" onChange={handleSourceChange} style={{ display: "none" }} />
            </label>
            {sourceFile && <span style={{ marginLeft: 10, fontSize: 12, color: "#ccc" }}>已选: {sourceFile.name}</span>}
          </div>
          
          <button onClick={handleAnalyze} disabled={analyzing || !sourceFile} style={{ width: "100%", padding: "14px", borderRadius: 8, background: analyzing ? "#333" : "#222", border: "1px solid #444", color: "#fff", cursor: analyzing ? "wait" : "pointer", marginTop: 10 }}>
            {analyzing ? `正在分析 (${analysisProgress}%)` : "开始分析剪辑手法"}
          </button>
          
          {analysisError && <div style={{ color: "#FF4D4D", marginTop: 10, fontSize: 13 }}>{analysisError}</div>}
        </div>

        {/* 右侧结果区 */}
        <div style={{ background: "rgba(10,12,18,0.6)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", padding: 24 }}>
           <h3 style={{ marginTop: 0 }}>分析结果看板</h3>
           {!analysisResult ? (
             <div style={{ color: "#666", fontSize: 14, fontStyle: "italic" }}>等待分析...</div>
           ) : (
             <div>
               <div style={{ marginBottom: 16 }}>
                 <div style={{ fontSize: 12, color: "#aaa" }}>剪辑风格</div>
                 <div style={{ fontSize: 20, fontWeight: "bold", color: "#4CE3A0" }}>{analysisResult.pace === 'fast' ? "快节奏 (Fast Paced)" : "叙事节奏 (Narrative)"}</div>
                 <div style={{ fontSize: 13, marginTop: 4 }}>平均镜头时长: {analysisResult.avgShotLength.toFixed(1)} 秒</div>
                 <div style={{ fontSize: 13 }}>总镜头数: {analysisResult.shots.length} 个</div>
               </div>
               <div style={{ height: 200, overflowY: "auto", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 10 }}>
                 {analysisResult.shots.map((shot, i) => (
                   <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 4 }}>
                     <span>镜头 {i + 1}</span>
                     <span>{shot.start.toFixed(1)}s - {shot.end.toFixed(1)}s</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>

      {/* ★★★ 这里就是你要的聊天窗口，已经集成在里面了 ★★★ */}
      <ChatWidget videoContext={analysisResult} />
      
    </div>
  );
}

export default App;