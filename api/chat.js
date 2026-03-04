// api/chat.js
import OpenAI from 'openai';

export default async function handler(req, res) {
  // 1. 设置跨域，允许你的网页访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { question, videoContext } = req.body;

  // 2. 初始化 DeepSeek 客户端
  // 注意：这里会自动读取你在 Vercel 里设置的 DEEPSEEK_API_KEY
  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com', // DeepSeek 的官方地址
    apiKey: process.env.DEEPSEEK_API_KEY 
  });

  try {
    // 3. 构建系统提示词 (让 DeepSeek 扮演剪辑大师)
    const systemPrompt = `
      你是一位拥有 20 年经验的好莱坞专业视频剪辑师和后期特效专家。
      用户正在分析一个视频，以下是该视频的一些上下文信息：
      ${videoContext ? JSON.stringify(videoContext) : '暂无具体视频信息'}

      请回答用户关于视频剪辑、特效制作、软件操作（如 Premiere Pro, After Effects, DaVinci Resolve）等方面的问题。
      你的回答必须：
      1. 专业且具体，使用准确的行业术语。
      2. 如果涉及软件操作，请给出具体的步骤或快捷键。
      3. 语气友好、自信。
    `;

    // 4. 调用 DeepSeek V3 模型 (deepseek-chat)
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      model: "deepseek-chat", // DeepSeek V3 的模型名称
    });

    const answer = completion.choices[0].message.content;

    res.status(200).json({ answer: answer });

  } catch (error) {
    console.error('DeepSeek Error:', error);
    res.status(500).json({ error: 'AI 思考失败，请检查密钥是否正确。' });
  }
}