import React, { useState, useRef, useEffect } from 'react';

// 这是聊天窗口组件
function ChatWidget({ videoContext }) {
  const [isOpen, setIsOpen] = useState(false); // 控制窗口打开/关闭
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是 DeepSeek 驱动的 AI 剪辑顾问。有什么我可以帮你的吗？' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // 1. 立即显示用户的问题
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 2. 发送请求给后端
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, videoContext })
      });
      
      const data = await res.json();
      
      // 3. 显示 AI 的回答
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer || "抱歉，由于网络原因我没能听到。" 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "发生错误，请检查 Vercel 环境变量是否配置正确。" }]);
    } finally {
      setLoading(false);
    }
  };

  // 简单的样式 (直接写在代码里方便你复制)
  const styles = {
    fixedPos: { position: 'fixed', bottom: 20, right: 20, zIndex: 9999, fontFamily: 'sans-serif' },
    circleBtn: { width: 60, height: 60, borderRadius: '50%', background: '#FF4D1C', color: '#fff', border: 'none', fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
    windowBox: { width: 350, height: 500, background: '#1D2231', borderRadius: 12, display: 'flex', flexDirection: 'column', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    header: { padding: 15, borderBottom: '1px solid #333', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    chatArea: { flex: 1, padding: 15, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
    inputArea: { padding: 15, borderTop: '1px solid #333', display: 'flex', gap: 10 },
    input: { flex: 1, padding: '10px', borderRadius: 20, border: 'none', background: '#333', color: '#fff', outline: 'none' },
    sendBtn: { padding: '8px 16px', background: '#FF4D1C', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }
  };

  return (
    <div style={styles.fixedPos}>
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} style={styles.circleBtn}>💬</button>
      ) : (
        <div style={styles.windowBox}>
          <div style={styles.header}>
            <span style={{fontWeight: 'bold'}}>AI 剪辑顾问 (DeepSeek)</span>
            <button onClick={() => setIsOpen(false)} style={{background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer'}}>×</button>
          </div>
          
          <div style={styles.chatArea}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#FF4D1C' : '#2A2F3E',
                padding: '8px 12px',
                borderRadius: 12,
                maxWidth: '85%',
                color: '#fff',
                fontSize: 14,
                lineHeight: 1.5
              }}>
                {m.content}
              </div>
            ))}
            {loading && <div style={{color: '#aaa', fontSize: 12}}>DeepSeek 正在思考...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="问我剪辑问题..." 
              style={styles.input}
            />
            <button onClick={handleSend} style={styles.sendBtn}>发送</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;