// 使用 React 18 的 createRoot API
const { useState } = React;

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = () => {
    if (!videoUrl.trim()) {
      alert('请先输入视频链接');
      return;
    }

    // 这里暂时用模拟数据，你可以之后接入真实接口
    setAnalysis({
      title: '示例分析结果',
      summary: '这是对你输入的视频进行的示例分析。',
      highlights: [
        '亮点一：精彩镜头剪辑流畅',
        '亮点二：节奏控制良好',
        '亮点三：情绪起伏设计合理',
      ],
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, #1b2436 0, #05070c 55%, #020308 100%)',
        color: '#F5F7FF',
        fontFamily: '"DM Sans", "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px',
      }}
    >
      <header style={{ maxWidth: 960, width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF4D1C, #FFB347)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 18,
              fontFamily: '"Syne", system-ui, sans-serif',
            }}
          >
            C
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>CutLens</div>
          <span
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 11,
              color: 'rgba(240,244,255,0.7)',
            }}
          >
            AI 剪辑分析师
          </span>
        </div>

        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.15,
            marginBottom: 16,
            fontWeight: 700,
          }}
        >
          一键解析你的剪辑作品，
          <span style={{ color: '#FF4D1C' }}>像审片导演一样给建议</span>
        </h1>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: 'rgba(230,236,255,0.8)',
            maxWidth: 560,
          }}
        >
          粘贴视频链接，CutLens 会从节奏、镜头、情绪、转场、文案等多个维度进行深度分析，
          给出可执行的优化建议，帮你更快做出爆款剪辑。
        </p>
      </header>

      <main style={{ maxWidth: 960, width: '100%', marginTop: 36 }}>
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
            gap: 24,
          }}
        >
          {/* 左侧：输入面板 */}
          <div
            style={{
              background: 'rgba(12,16,26,0.94)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid rgba(148,163,255,0.16)',
              boxShadow:
                '0 18px 45px rgba(0,0,0,0.65), 0 0 0 1px rgba(15,23,42,0.65)',
            }}
          >
            <div style={{ marginBottom: 10, fontSize: 13, color: 'rgba(199,210,254,0.85)' }}>
              视频链接
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="粘贴 B 站 / 抖音 / 快手 / 小红书 等视频链接"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(148,163,255,0.3)',
                  background: 'rgba(15,23,42,0.85)',
                  color: '#E5EDFF',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAnalyze}
                style={{
                  padding: '10px 20px',
                  borderRadius: 999,
                  border: 'none',
                  background:
                    'linear-gradient(135deg, #FF4D1C, #FF8A4A)',
                  color: '#0B0F1A',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(255,77,28,0.45)',
                }}
              >
                分析剪辑
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(148,163,255,0.85)',
              }}
            >
              支持公开视频链接，整个过程仅做分析，不会对你的视频做任何修改。
            </div>
          </div>

          {/* 右侧：结果面板 */}
          <div
            style={{
              background:
                'radial-gradient(circle at top left, rgba(255,77,28,0.16), transparent 55%), rgba(10,15,26,0.97)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid rgba(148,163,255,0.18)',
              color: 'rgba(226,232,255,0.92)',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {!analysis && (
              <div style={{ opacity: 0.8 }}>
                等你粘贴视频链接并点击「分析剪辑」，这里会展示：
                <br />
                · 视频整体风格与目标受众匹配度
                <br />
                · 镜头节奏、转场衔接、情绪曲线分析
                <br />
                · 最打动人的 3~5 个片段亮点
                <br />
                · 具体可执行的剪辑优化建议
              </div>
            )}

            {analysis && (
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {analysis.title}
                </div>
                <p style={{ marginBottom: 10 }}>{analysis.summary}</p>
                <div>
                  {analysis.highlights.map((h, idx) => (
                    <div key={idx} style={{ marginBottom: 6 }}>
                      · {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
