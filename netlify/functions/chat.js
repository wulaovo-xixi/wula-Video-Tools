import OpenAI from 'openai';

exports.handler = async function(event, context) {
  // 1. 允许跨域 (CORS) - 解决浏览器报错的关键
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 2. 解析前端发来的数据
    const { question, videoContext } = JSON.parse(event.body);

    // 3. 连接 DeepSeek
    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY // 这里的名字没变，一会去 Netlify 设置
    });

    const systemPrompt = `
      你是一位好莱坞专业剪辑师。请根据用户提供的视频数据：
      ${videoContext ? JSON.stringify(videoContext) : '暂无数据'}
      
      推测剪辑手法，并必须返回纯 JSON 格式：
      {
        "style": "风格描述",
        "tools": ["工具1", "工具2"],
        "timeline": [{"time": "00:00", "tech": "J-Cut", "reason": "原因"}],
        "advice": "建议"
      }
    `;

    // 4. 发送请求
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      model: "deepseek-chat",
    });

    // 5. 返回结果
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer: completion.choices[0].message.content })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "AI 思考失败: " + error.message })
    };
  }
};