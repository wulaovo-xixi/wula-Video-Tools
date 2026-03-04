import OpenAI from 'openai';

// 处理 Vercel Edge Runtime (可选，为了更好兼容性)
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. 允许跨域
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

    // 2. 连接 DeepSeek
    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY 
    });

    const systemPrompt = `
      你是一位专业剪辑师。用户正在分析视频，信息如下：
      ${videoContext ? JSON.stringify(videoContext) : '无'}
      请回答用户关于剪辑、PR/AE操作的问题。
    `;

    // 3. 发送请求
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