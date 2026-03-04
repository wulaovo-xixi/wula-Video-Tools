import OpenAI from 'openai';

// Vercel 边缘计算配置，速度更快
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. 处理浏览器的预检请求 (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { question, videoContext } = await req.json();

    // 2. 连接 DeepSeek (自动读取环境变量 DEEPSEEK_API_KEY)
    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY 
    });

    // 3. 设定 AI 角色
    const systemPrompt = `
      你是一位专业视频剪辑师。
      用户当前分析的视频信息：${videoContext ? JSON.stringify(videoContext) : '暂无'}
      请简短、专业地回答用户关于剪辑技术的问题。
    `;

    // 4. 发送请求
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      model: "deepseek-chat",
    });

    const answer = completion.choices[0].message.content;

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'AI 连接失败: ' + error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}