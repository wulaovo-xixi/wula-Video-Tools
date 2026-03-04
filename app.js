const { useState, useEffect } = React;

// 从网页链接解析平台与嵌入地址（B站可嵌入，其他仅识别）
function parseVideoPageLink(url) {
  const raw = (url || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    // B站: bilibili.com/video/BVxxx 或 b23.tv
    if (host.includes("bilibili.com")) {
      const m = raw.match(/\/(BV[\w]{10})/i) || raw.match(/bvid=([\w]{12})/i);
      const bvid = m ? (m[1].toUpperCase().startsWith("BV") ? m[1].toUpperCase().slice(0, 12) : "BV" + m[1]) : null;
      if (bvid) {
        return { platform: "bilibili", name: "哔哩哔哩", embedUrl: "https://player.bilibili.com/player.html?bvid=" + bvid + "&high_quality=1", pageUrl: raw };
      }
    }
    if (host === "b23.tv" || host.endsWith(".b23.tv")) {
      return { platform: "bilibili", name: "哔哩哔哩", embedUrl: null, pageUrl: raw, needRedirect: true };
    }
    // 抖音
    if (host.includes("douyin.com") || host.includes("iesdouyin.com")) {
      return { platform: "douyin", name: "抖音", embedUrl: null, pageUrl: raw };
    }
    // 快手
    if (host.includes("kuaishou.com") || host.includes("gifshow.com")) {
      return { platform: "kuaishou", name: "快手", embedUrl: null, pageUrl: raw };
    }
    // 小红书
    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) {
      return { platform: "xiaohongshu", name: "小红书", embedUrl: null, pageUrl: raw };
    }
    return { platform: "unknown", name: "网页视频", embedUrl: null, pageUrl: raw };
  } catch (_) {
    return null;
  }
}

function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [targetFiles, setTargetFiles] = useState([]); // [{ id, file, url }]

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
  const [applyResults, setApplyResults] = useState([]); // [{ id, fileName, duration, cuts }]
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      for (const t of targetFiles) {
        if (t.url) URL.revokeObjectURL(t.url);
      }
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
    if (invalid) {
      setAnalysisError("应用模板时也需要选择视频文件（请不要混入非视频）。");
      return;
    }
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
    // 允许重复选择同一文件：重置 input 值
    e.target.value = "";
  };

  const clearSource = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(null);
    setAnalysisResult(null);
    setTemplatePlan(null);
    setApplyResults([]);
    setAnalysisError("");
    setAnalysisProgress(0);
  };

  const removeTarget = (id) => {
    setTargetFiles((prev) => {
      const item = prev.find((t) => t.id === id);
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((t) => t.id !== id);
    });
    setApplyResults((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllTargets = () => {
    for (const t of targetFiles) {
      if (t.url) URL.revokeObjectURL(t.url);
    }
    setTargetFiles([]);
    setApplyResults([]);
  };

  async function analyzeVideoEditing(file, onProgress) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.crossOrigin = "anonymous";
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      video.addEventListener("error", () => {
        cleanup();
        reject(new Error("无法读取该视频，请尝试更换文件。"));
      });

      video.addEventListener("loadedmetadata", async () => {
        if (!video.duration || !isFinite(video.duration)) {
          cleanup();
          reject(new Error("无法获取视频时长。"));
          return;
        }

        const duration = video.duration;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const targetWidth = 192;
        const targetHeight = 108;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const step = Math.max(0.4, duration / 120);
        const totalSamples = Math.max(1, Math.ceil(duration / step));
        let doneSamples = 0;

        let prevVector = null;
        const diffs = [];
        const cutTimes = [0];

        const captureAt = (time) =>
          new Promise((res) => {
            const onSeeked = () => {
              ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
              const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
              const data = imageData.data;

              const vector = [];
              const stride = 12;
              for (let i = 0; i < data.length; i += stride) {
                vector.push(data[i], data[i + 1], data[i + 2]);
              }

              if (prevVector) {
                let diff = 0;
                const len = Math.min(prevVector.length, vector.length);
                for (let i = 0; i < len; i++) {
                  diff += Math.abs(prevVector[i] - vector[i]);
                }
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
            // eslint-disable-next-line no-await-in-loop
            await captureAt(t);
            doneSamples += 1;
            if (typeof onProgress === "function") {
              onProgress(Math.min(99, Math.round((doneSamples / totalSamples) * 100)));
            }
          }
        } catch (err) {
          cleanup();
          reject(err);
          return;
        }

        cleanup();
        if (typeof onProgress === "function") onProgress(100);

        if (!diffs.length) {
          resolve({
            duration,
            shots: [{ start: 0, end: duration }],
            pace: "slow",
            avgShotLength: duration,
            cutCount: 0,
            description: "视频基本为单段长镜头，节奏较为舒缓。",
          });
          return;
        }

        const values = diffs.map((d) => d.diff).sort((a, b) => a - b);
        const p80 = values[Math.floor(values.length * 0.8)];
        const p90 = values[Math.floor(values.length * 0.9)];
        const threshold = (p80 + p90) / 2 || values[values.length - 1];

        for (const entry of diffs) {
          if (entry.diff >= threshold) {
            const lastCut = cutTimes[cutTimes.length - 1];
            if (entry.time - lastCut > 0.6) {
              cutTimes.push(entry.time);
            }
          }
        }

        if (cutTimes[cutTimes.length - 1] < duration - 0.3) {
          cutTimes.push(duration);
        }

        const shots = [];
        for (let i = 0; i < cutTimes.length - 1; i++) {
          shots.push({ start: cutTimes[i], end: cutTimes[i + 1] });
        }

        const shotLengths = shots.map((s) => s.end - s.start);
        const avgShotLength =
          shotLengths.reduce((sum, v) => sum + v, 0) / shotLengths.length;

        let pace;
        let description;
        if (avgShotLength < 1.8) {
          pace = "fast";
          description =
            "整体为快节奏剪辑，镜头切换频繁，适合节奏感强、信息密度高的内容。";
        } else if (avgShotLength < 3.5) {
          pace = "medium";
          description =
            "节奏适中，兼顾信息量和观感，适合大多数 vlog、叙事类内容。";
        } else {
          pace = "slow";
          description =
            "镜头偏长，节奏偏慢，更偏向情绪氛围或叙事铺垫。";
        }

        const pattern = shots.map((s) => ({
          startRatio: s.start / duration,
          endRatio: s.end / duration,
          length: s.end - s.start,
        }));

        resolve({
          duration,
          shots,
          cutCount: shots.length - 1,
          avgShotLength,
          pace,
          description,
          pattern,
        });
      });
    });
  }

  const handleAnalyze = async () => {
    if (!sourceFile) {
      setAnalysisError("请先上传一个要分析的源视频。");
      return;
    }
    setAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisError("");
    setAnalysisResult(null);
    setTemplatePlan(null);
    setApplyResults([]);
    try {
      const result = await analyzeVideoEditing(sourceFile, (p) => setAnalysisProgress(p));
      setAnalysisResult(result);

      const template = {
        title: "基于示例视频的剪辑节奏模板",
        moodHint:
          result.pace === "fast"
            ? "适合节奏感强、信息密度高的作品（宣传片、开场、剪辑集锦）。"
            : result.pace === "medium"
            ? "适合 vlog、记录类、访谈类，兼顾信息与情绪。"
            : "适合情绪氛围、故事铺垫、情感表达。",
        pace: result.pace,
        avgShotLengthSeconds: Number(result.avgShotLength.toFixed(2)),
        shotCount: result.shots.length,
        structure: result.pattern.map((p, idx) => ({
          index: idx + 1,
          startRatio: Number((p.startRatio * 100).toFixed(1)),
          endRatio: Number((p.endRatio * 100).toFixed(1)),
          lengthSeconds: Number(p.length.toFixed(2)),
        })),
      };
      setTemplatePlan(template);
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || "分析失败，请稍后重试。");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!templatePlan || !analysisResult) {
      setAnalysisError("请先分析一个示例视频，生成剪辑模板。");
      return;
    }
    if (!targetFiles.length) {
      setAnalysisError("请先选择一个或多个要应用模板的新视频。");
      return;
    }
    setAnalysisError("");
    setApplyResults([]);
    setApplying(true);
    setApplyProgress(0);

    const results = [];
    for (let i = 0; i < targetFiles.length; i++) {
      const tf = targetFiles[i];
      // eslint-disable-next-line no-await-in-loop
      const r = await new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        const objectUrl = tf.url || URL.createObjectURL(tf.file);
        video.src = objectUrl;

        const fail = (msg) => resolve({ id: tf.id, fileName: tf.file.name, error: msg || "无法读取视频" });

        video.addEventListener("error", () => fail("无法读取目标视频，请尝试更换文件。"));
        video.addEventListener("loadedmetadata", () => {
          const duration = video.duration;
          if (!duration || !isFinite(duration)) {
            fail("无法获取目标视频时长。");
            return;
          }
          const cuts = templatePlan.structure.map((s, idx) => {
            const start = (s.startRatio / 100) * duration;
            const end = (s.endRatio / 100) * duration;
            return { index: idx + 1, start, end, length: end - start };
          });
          resolve({ id: tf.id, fileName: tf.file.name, duration, cuts });
        });
      });
      results.push(r);
      setApplyProgress(Math.round(((i + 1) / targetFiles.length) * 100));
    }

    setApplyResults(results);
    setApplying(false);
  };

  const formatTime = (seconds) => {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s - Math.floor(s)) * 1000);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(
      2,
      "0"
    )}.${String(ms).padStart(3, "0")}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #1D2231 0, #05060A 52%, #050509 100%)",
        color: "#F7F8FF",
        fontFamily: "'DM Sans', 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "32px 24px 40px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.1fr)",
          gap: 32,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 11px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(90deg, rgba(255,77,28,0.18), rgba(24,24,32,0.85))",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                background:
                  "conic-gradient(from 140deg, #FF7B2F, #FF4D1C, #FF7B2F)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  backgroundColor: "#050509",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(248,250,255,0.9)",
                fontWeight: 500,
              }}
            >
              CutLens · AI 剪辑分析
            </span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontFamily: "'Syne', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 800,
                letterSpacing: "-0.06em",
                fontSize: 52,
                lineHeight: 1.03,
                marginBottom: 14,
                color: "#FDFDFE",
              }}
            >
              一键拆解你的剪辑作品，
            </h1>
            <h1
              style={{
                fontFamily: "'Syne', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 800,
                letterSpacing: "-0.06em",
                fontSize: 48,
                lineHeight: 1.03,
                marginBottom: 18,
                background:
                  "linear-gradient(90deg, #FFB341 0%, #FF4D1C 45%, #FF7B7B 100%)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              像影片导演一样给出模板。
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "rgba(223,225,240,0.88)",
                maxWidth: 520,
              }}
            >
              上传任意一条你满意的剪辑作品，CutLens 会自动拆解镜头、节奏与结构，
              生成一份可复用的「剪辑节奏模板」。再给它一条新素材，
              它会为你生成一整份相同风格的剪辑方案。
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                color: "rgba(186,194,226,0.95)",
                marginBottom: 8,
              }}
            >
              视频链接
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                value={pageLinkInput}
                onChange={(e) => {
                  setPageLinkInput(e.target.value);
                  setLinkImport(null);
                }}
                placeholder="粘贴 B站 / 抖音 / 快手 / 小红书 等视频网页链接"
                style={{
                  flex: "1 1 280px",
                  minWidth: 0,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,255,0.28)",
                  background: "rgba(15,23,42,0.85)",
                  color: "#E5EDFF",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="button"
                disabled={parsingLink}
                onClick={async () => {
                  const raw = pageLinkInput.trim();
                  if (!raw) {
                    setAnalysisError("请先粘贴视频链接");
                    return;
                  }
                  const parsed = parseVideoPageLink(raw);
                  if (!parsed) {
                    setAnalysisError("无法识别该链接，请粘贴完整的视频页面地址。");
                    return;
                  }
                  setParsingLink(true);
                  setAnalysisError("");
                  setLinkImport(null);
                  setPreviewLoaded(false);
                  try {
                    const base = typeof window !== "undefined" && window.location ? (window.location.origin || "") : "";
                    const res = await fetch((base + "/api/get-video-info").replace("//api", "/api"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: raw }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 501 || !res.ok) {
                      setLinkImport({ ...parsed, apiUnavailable: true, hint: data.error || "当前环境暂不支持从链接解析" });
                      return;
                    }
                    setLinkImport({
                      ...parsed,
                      title: data.title,
                      directUrl: data.directUrl,
                      filesize: data.filesize,
                      safeFilename: data.safeFilename,
                    });
                  } catch (e) {
                    setLinkImport({ ...parsed, apiUnavailable: true, hint: e.message || "网络请求失败" });
                  } finally {
                    setParsingLink(false);
                  }
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #5B7FFF 0%, #7F2EFF 100%)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {parsingLink ? "解析中…" : "解析并导入"}
              </button>
            </div>
            {parsingLink && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "rgba(186,194,226,0.9)", marginBottom: 4 }}>解析进度</div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "40%", background: "linear-gradient(90deg, #5B7FFF, #7F2EFF)", borderRadius: 999, animation: "cutlens-progress 1.2s ease-in-out infinite" }} />
                </div>
              </div>
            )}
            <p
              style={{
                fontSize: 11,
                color: "rgba(152,160,199,0.9)",
                marginTop: 6,
              }}
            >
              支持公开视频链接，仅做解析与预览，不会修改你的视频。
            </p>
            {linkImport && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(200,208,245,0.98)", marginBottom: 8 }}>
                  已识别为「{linkImport.name}」链接{linkImport.title ? ` · ${linkImport.title}` : ""}
                </div>
                {linkImport.embedUrl ? (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "rgba(186,194,226,0.9)", marginBottom: 4 }}>预览进度</div>
                      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: previewLoaded ? "100%" : "30%",
                            background: "linear-gradient(90deg, #FF8A3C, #FF4D1C)",
                            borderRadius: 999,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: 560,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#000",
                        aspectRatio: "16/9",
                      }}
                    >
                      <iframe
                        src={linkImport.embedUrl}
                        title="视频预览"
                        onLoad={() => setPreviewLoaded(true)}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                        allowFullScreen
                      />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {linkImport.apiUnavailable ? (
                        <p style={{ fontSize: 11, color: "rgba(175,182,215,0.95)" }}>
                          {linkImport.hint}。请下载该视频后使用下方「选择示例视频」上传，或直接选择本地文件。
                        </p>
                      ) : linkImport.directUrl ? (
                        <>
                          <button
                            type="button"
                            disabled={downloading}
                            onClick={async () => {
                              const pageUrl = linkImport.pageUrl;
                              if (!pageUrl) return;
                              setDownloading(true);
                              setDownloadProgress(0);
                              setAnalysisError("");
                              const base = typeof window !== "undefined" && window.location ? window.location.origin : "";
                              try {
                                const res = await fetch((base + "/api/download-video?url=" + encodeURIComponent(pageUrl)).replace("//api", "/api"));
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  setAnalysisError(err.error || "下载失败，请尝试在新标签页打开链接保存");
                                  if (linkImport.directUrl) window.open(linkImport.directUrl, "_blank");
                                  return;
                                }
                                const total = res.headers.get("Content-Length");
                                const reader = res.body.getReader();
                                const chunks = [];
                                let received = 0;
                                while (true) {
                                  const { done, value } = await reader.read();
                                  if (done) break;
                                  chunks.push(value);
                                  received += value.length;
                                  if (total) setDownloadProgress(Math.min(99, Math.round((received / Number(total)) * 100)));
                                }
                                setDownloadProgress(100);
                                const blob = new Blob(chunks, { type: "video/mp4" });
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(blob);
                                a.download = linkImport.safeFilename || "video.mp4";
                                a.click();
                                URL.revokeObjectURL(a.href);
                              } catch (e) {
                                setAnalysisError(e.message || "下载失败");
                                if (linkImport.directUrl) window.open(linkImport.directUrl, "_blank");
                              } finally {
                                setDownloading(false);
                                setDownloadProgress(null);
                              }
                            }}
                            style={{
                              padding: "8px 14px",
                              borderRadius: 999,
                              border: "none",
                              background: "linear-gradient(135deg, #4CE3A0, #26C6DA)",
                              color: "#05070C",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: downloading ? "default" : "pointer",
                            }}
                          >
                            {downloading ? "下载中…" : "下载视频"}
                          </button>
                          {downloading && downloadProgress != null && (
                            <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                              <div style={{ fontSize: 11, color: "rgba(186,194,226,0.9)", marginBottom: 2 }}>下载进度</div>
                              <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: downloadProgress + "%", background: "linear-gradient(90deg, #4CE3A0, #26C6DA)", borderRadius: 999, transition: "width 0.2s ease" }} />
                              </div>
                            </div>
                          )}
                          <span style={{ fontSize: 11, color: "rgba(152,160,199,0.9)" }}>
                            或 <a href={linkImport.directUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#7F2EFF" }}>在新标签页打开直链</a> 保存
                          </span>
                        </>
                      ) : (
                        <p style={{ fontSize: 11, color: "rgba(152,160,199,0.9)" }}>
                          要进行剪辑节奏分析，请下载该视频后使用下方「选择示例视频」上传，或直接选择本地文件。
                        </p>
                      )}
                    </div>
                  </>
                ) : linkImport.needRedirect ? (
                  <p style={{ fontSize: 11, color: "rgba(175,182,215,0.95)" }}>
                    短链接已保存。请打开该链接，在浏览器地址栏复制含 BV 号的完整视频页地址，再粘贴到上方输入框重新解析。
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: "rgba(175,182,215,0.95)" }}>
                    已保存链接。该平台暂不支持页面内预览。要进行剪辑分析，请先在对应 App 内下载视频，再使用下方「选择示例视频」上传本地文件。
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12, marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(186,194,226,0.95)", marginBottom: 6, fontWeight: 600 }}>
              手动上传视频分析
            </div>
            <p style={{ fontSize: 11, color: "rgba(152,160,199,0.85)", marginBottom: 10 }}>
              选择本地视频文件，即可解析剪辑节奏并生成模板，无需粘贴链接。
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 26,
            }}
          >
            <label
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, #FF7B2F 0%, #FF4D1C 40%, #E72E6A 100%)",
                color: "#050509",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow:
                  "0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255, 138, 76, 0.38)",
              }}
            >
              选择示例视频进行分析
              <input
                type="file"
                accept="video/*"
                onChange={handleSourceChange}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
            </label>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: analyzing
                  ? "rgba(18,22,33,0.9)"
                  : "rgba(8,10,16,0.9)",
                color: analyzing
                  ? "rgba(181,186,210,0.9)"
                  : "rgba(230,233,252,0.96)",
                fontSize: 13,
                fontWeight: 500,
                cursor: analyzing ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {analyzing ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#FF7B2F",
                      animation: "cutlens-spin 0.9s linear infinite",
                    }}
                  />
                  正在解析剪辑节奏…
                </>
              ) : (
                "开始分析剪辑手法"
              )}
            </button>
          </div>
          {analyzing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "rgba(186,194,226,0.9)", marginBottom: 4 }}>分析进度</div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${analysisProgress || 0}%`,
                    background: "linear-gradient(90deg, #FF8A3C, #FF4D1C)",
                    borderRadius: 999,
                    transition: "width 0.15s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "rgba(152,160,199,0.9)", marginTop: 4 }}>
                {analysisProgress}%
              </div>
            </div>
          )}
          {sourceFile && (
            <div
              style={{
                marginBottom: 22,
                padding: "10px 12px",
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(22,25,36,0.96), rgba(15,18,26,0.96))",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background:
                      "linear-gradient(140deg, #FF8A3C, #FF4D1C, #7F2EFF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  MP4
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(239,242,255,0.98)",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      maxWidth: 260,
                    }}
                  >
                    {sourceFile.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(176,182,210,0.9)",
                    }}
                  >
                    源视频 · 将作为「风格样本」拆解节奏与结构
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {sourceUrl && (
                  <video
                    src={sourceUrl}
                    style={{
                      width: 120,
                      height: 70,
                      borderRadius: 10,
                      objectFit: "cover",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "#050509",
                    }}
                    muted
                    loop
                    autoPlay
                  />
                )}
                <button
                  type="button"
                  onClick={clearSource}
                  title="清除并重新选择"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,80,80,0.2)",
                    color: "rgba(255,180,180,0.98)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  清除
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              fontSize: 11,
            }}
          >
            <div
              style={{
                padding: "9px 10px",
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(27,32,48,0.96), rgba(22,27,41,0.96))",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(175,181,209,0.95)",
                  marginBottom: 4,
                }}
              >
                镜头节奏
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#F7F8FF",
                  marginBottom: 2,
                }}
              >
                {analysisResult
                  ? `${analysisResult.shots.length} 段镜头 · 平均 ${analysisResult.avgShotLength.toFixed(
                      1
                    )}s`
                  : "自动检测切点与镜头长度"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(163,170,205,0.94)",
                }}
              >
                快 · 中 · 慢三档节奏判断，适配不同类型内容。
              </div>
            </div>
            <div
              style={{
                padding: "9px 10px",
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(25,28,43,0.96), rgba(17,21,33,0.96))",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(175,181,209,0.95)",
                  marginBottom: 4,
                }}
              >
                结构与段落
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#F7F8FF",
                  marginBottom: 2,
                }}
              >
                {analysisResult
                  ? "自动生成「时间线结构图」"
                  : "识别起承转合与重点段落"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(163,170,205,0.94)",
                }}
              >
                把一条完整视频，拆成可复用的时间轴模板。
              </div>
            </div>
            <div
              style={{
                padding: "9px 10px",
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(31,26,48,0.96), rgba(18,13,33,0.96))",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(175,181,209,0.95)",
                  marginBottom: 4,
                }}
              >
                模板复刻
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#F7F8FF",
                  marginBottom: 2,
                }}
              >
                一键生成相似剪辑方案
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(163,170,205,0.94)",
                }}
              >
                导出时间码与剪辑脚本，直接丢进你熟悉的软件。
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 24,
            background:
              "radial-gradient(circle at 0% 0%, rgba(255,108,43,0.16), transparent 55%), radial-gradient(circle at 100% 0%, rgba(120,78,255,0.18), transparent 50%), linear-gradient(145deg, #090B12, #05070C)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 22px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.03)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(179,187,221,0.9)",
                  marginBottom: 2,
                }}
              >
                TIMELINE BLUEPRINT
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(225,229,251,0.96)",
                }}
              >
                剪辑时间线 · 节奏与模板
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                padding: "5px 8px",
                borderRadius: 999,
                background: "rgba(9,11,18,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 11,
                color: "rgba(178,184,214,0.96)",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    analysisResult && !analyzing
                      ? "#3EE07D"
                      : "rgba(255,188,76,0.95)",
                  boxShadow:
                    analysisResult && !analyzing
                      ? "0 0 0 4px rgba(62,224,125,0.18)"
                      : "0 0 0 4px rgba(255,188,76,0.18)",
                }}
              />
              {analysisResult && !analyzing
                ? "已生成剪辑模板"
                : analyzing
                ? "正在分析示例视频…"
                : "等待你上传示例视频"}
            </div>
          </div>

          {analysisError && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, rgba(72,19,24,0.95), rgba(32,9,11,0.98))",
                border: "1px solid rgba(255,105,105,0.65)",
                color: "rgba(255,217,223,0.96)",
                fontSize: 12,
                marginBottom: 2,
              }}
            >
              {analysisError}
            </div>
          )}

          <div
            style={{
              position: "relative",
              borderRadius: 16,
              padding: 12,
              background:
                "linear-gradient(135deg, rgba(9,12,20,0.98), rgba(9,13,23,0.98))",
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 10% 0%, rgba(255,121,60,0.15), transparent 52%), radial-gradient(circle at 90% 0%, rgba(108,82,255,0.18), transparent 50%)",
                opacity: 0.9,
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(186,194,226,0.95)",
                  }}
                >
                  剪辑时间线总览
                </div>
                {analysisResult && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 11,
                      color: "rgba(186,194,226,0.96)",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      时长 {analysisResult.duration.toFixed(1)}s ·{" "}
                      {analysisResult.shots.length} 段镜头
                    </span>
                    <span
                      style={{
                        width: 1,
                        height: 11,
                        backgroundColor: "rgba(139,146,182,0.7)",
                      }}
                    />
                    <span>
                      平均每段 {analysisResult.avgShotLength.toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  position: "relative",
                  padding: "10px 8px 12px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(90deg, rgba(9,11,18,0.96), rgba(12,15,24,0.98))",
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(133,140,176,0.96)",
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>TIMELINE</span>
                  <span>
                    {analysisResult
                      ? analysisResult.pace === "fast"
                        ? "FAST PACE"
                        : analysisResult.pace === "medium"
                        ? "MEDIUM PACE"
                        : "SLOW PACE"
                      : "PENDING ANALYSIS"}
                  </span>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 56,
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #111320, #090B13, #101422)",
                    overflow: "hidden",
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.95)",
                    padding: "0 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {analysisResult ? (
                    analysisResult.pattern.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex:
                            (p.endRatio - p.startRatio) * 90 + 5,
                          height:
                            analysisResult.pace === "fast"
                              ? 22
                              : analysisResult.pace === "medium"
                              ? 28
                              : 24,
                          borderRadius: 999,
                          background:
                            idx % 2 === 0
                              ? "linear-gradient(135deg, #FF8A3C, #FF4D1C)"
                              : "linear-gradient(135deg, #7A5CFF, #FF4D9E)",
                          boxShadow:
                            "0 0 0 1px rgba(0,0,0,0.7), 0 10px 24px rgba(0,0,0,0.95)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(90deg, rgba(0,0,0,0.15), rgba(255,255,255,0.05), rgba(0,0,0,0.4))",
                            mixBlendMode: "soft-light",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            left: 6,
                            bottom: 4,
                            fontSize: 9,
                            fontWeight: 600,
                            color: "rgba(9,11,18,0.9)",
                            textShadow:
                              "0 1px 2px rgba(0,0,0,0.6)",
                          }}
                        >
                          {idx + 1}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(141,148,184,0.85)",
                      }}
                    >
                      上传一条你满意的剪辑作品，我们会自动帮你生成时间线结构。
                    </div>
                  )}
                </div>
              </div>

              {templatePlan && (
                <div
                  style={{
                    padding: "10px 11px",
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, rgba(9,13,24,0.98), rgba(10,14,26,0.98))",
                    border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(186,194,226,0.98)",
                      }}
                    >
                      剪辑节奏模板
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(145,154,196,0.95)",
                      }}
                    >
                      平均每镜头 {templatePlan.avgShotLengthSeconds}s ·{" "}
                      {templatePlan.shotCount} 段
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(163,170,205,0.94)",
                    }}
                  >
                    {analysisResult?.description}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(179,186,217,0.96)",
                    }}
                  >
                    {templatePlan.moodHint}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: "11px 12px",
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(8,11,18,0.98), rgba(10,14,24,0.98))",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(190,197,230,0.96)",
                }}
              >
                应用到新素材 · 生成相似剪辑方案
              </div>
              <label
                style={{
                  position: "relative",
                  fontSize: 11,
                  padding: "5px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background:
                    "linear-gradient(135deg, rgba(18,21,32,0.96), rgba(10,13,22,0.98))",
                  color: "rgba(215,222,255,0.96)",
                  cursor: "pointer",
                }}
              >
                选择目标视频
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleTargetChange}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
              </label>
            </div>
            {targetFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "rgba(163,170,205,0.94)" }}>
                    已导入 {targetFiles.length} 个目标视频（可多选）
                  </div>
                  <button
                    type="button"
                    onClick={clearAllTargets}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,80,80,0.22)",
                      color: "rgba(255,180,180,0.98)",
                      fontSize: 11,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    清空全部
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflow: "auto" }}>
                  {targetFiles.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "6px 8px",
                        borderRadius: 10,
                        background: "rgba(14,18,30,0.98)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "rgba(215,222,255,0.98)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.file.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTarget(t.id)}
                        style={{
                          flexShrink: 0,
                          padding: "4px 8px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(255,80,80,0.22)",
                          color: "rgba(255,180,180,0.98)",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(152,160,199,0.96)",
                  maxWidth: 260,
                }}
              >
                我们会根据示例视频的镜头节奏，在新素材上生成一套时间码和
                EDL 风格的剪辑建议，你可以直接在 PR / FCP / 剪映里对照操作。
              </div>
              <button
                onClick={handleApplyTemplate}
                disabled={applying}
                style={{
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #4CE3A0, #26C6DA)",
                  color: "#05070C",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: applying ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {applying ? "生成中…" : "生成剪辑方案"}
              </button>
            </div>
          </div>

          {applying && (
            <div
              style={{
                padding: "11px 12px",
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, rgba(8,11,18,0.98), rgba(10,14,24,0.98))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(215,222,255,0.98)", marginBottom: 6 }}>
                生成进度：{applyProgress}%
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${applyProgress}%`, background: "linear-gradient(90deg, #4CE3A0, #26C6DA)", borderRadius: 999, transition: "width 0.15s ease" }} />
              </div>
            </div>
          )}

          {applyResults.length > 0 && (
            <div
              style={{
                padding: "11px 12px",
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, rgba(8,11,18,0.98), rgba(10,14,24,0.98))",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 11,
                color: "rgba(186,193,226,0.96)",
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  marginBottom: 2,
                  color: "rgba(215,222,255,0.98)",
                }}
              >
                剪辑方案（多目标视频）
              </div>
              {applyResults.map((r) => (
                <div key={r.id} style={{ padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "rgba(228,234,255,0.96)", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.fileName}
                    </div>
                    {r.error ? (
                      <span style={{ fontSize: 11, color: "rgba(255,180,180,0.98)" }}>{r.error}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "rgba(160,168,208,0.96)" }}>{r.duration.toFixed(1)}s</span>
                    )}
                  </div>
                  {!r.error && (
                    <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
                      {r.cuts.map((c) => (
                        <li
                          key={c.index}
                          style={{
                            padding: "5px 7px",
                            borderRadius: 8,
                            background: "rgba(14,18,30,0.98)",
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "rgba(228,234,255,0.96)", marginRight: 6 }}>
                            段落 {c.index}
                          </span>
                          <span>
                            {formatTime(c.start)} → {formatTime(c.end)} · {c.length.toFixed(2)}s
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <div
                style={{
                  marginTop: 4,
                  color: "rgba(147,156,198,0.94)",
                }}
              >
                提示：你可以把这些时间码当作「剪辑框架」，再根据内容细调每一个切点和转场效果。
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
        @keyframes cutlens-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cutlens-progress {
          0%, 100% { transform: translateX(-60%); }
          50% { transform: translateX(120%); }
        }
        @media (max-width: 960px) {
          body {
            padding: 16px 14px 24px;
          }
        }
      `}
      </style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

