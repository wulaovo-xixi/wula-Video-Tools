// api/get-video-info.js

export default async function handler(req, res) {
  // 设置 CORS 头，允许你的网页跨域访问
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理预检请求 (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.body || req.query;

  if (!url) {
    return res.status(400).json({ error: '缺少 URL 参数' });
  }

  try {
    // 1. 针对 Bilibili 的特殊处理 (使用官方公开 API)
    if (url.includes('bilibili.com') || url.includes('b23.tv')) {
      const bvidMatch = url.match(/(BV\w{10})/i);
      if (bvidMatch) {
        const bvid = bvidMatch[1];
        // 调用 B站 API 获取信息
        const biliRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
        const biliData = await biliRes.json();

        if (biliData.code === 0) {
          const info = biliData.data;
          return res.status(200).json({
            title: info.title,
            cover: info.pic,
            // B站视频流通常分段且有防盗链，直接下载较难，这里返回元数据
            // 让前端提示用户去 App 下载或使用第三方工具
            directUrl: null, 
            safeFilename: `${info.title}.mp4`.replace(/[\\/:*?"<>|]/g, "_"),
            filesize: null,
            platform: 'bilibili'
          });
        }
      }
    }

    // 2. 通用网页处理 (尝试抓取 <title>)
    // 伪装成浏览器 User-Agent
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // 使用正则提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '未知视频';

    return res.status(200).json({
      title: title.trim(),
      directUrl: null, // 通用解析很难直接拿到 MP4
      safeFilename: `${title.trim()}.mp4`.replace(/[\\/:*?"<>|]/g, "_"),
      platform: 'web'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '解析失败: ' + error.message });
  }
}
