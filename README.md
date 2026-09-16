# 灵魂颜色测试

一个纯静态的「灵魂颜色」性格测试网站。用户回答 15 道题，最终得到属于自己的
「灵魂颜色」，并展示该颜色的名字、色值（hex）与背后的故事文案。

## 目录结构

```
colortest/
├── index.html          # 页面入口（开始页 / 答题页 / 结果页）
├── css/
│   └── style.css       # 样式
├── js/
│   ├── data.js         # 颜色数据 + 15 道题目
│   └── app.js          # 答题、计分、结果渲染、分享逻辑
├── color.txt           # 原始颜色数据（来源）
└── README.md
```

## 本地预览

项目为纯静态页面，无构建步骤、无外部依赖，任选其一即可：

```bash
# 方式一：Python
python -m http.server 8000

# 方式二：Node（需要先安装 serve，可选）
npx serve .

# 方式三：直接用浏览器打开 index.html（部分浏览器会限制 file:// 下的 hash 路由，推荐前两种）
```

然后访问 `http://localhost:8000`。

## 部署到服务器

把整个目录内容上传到任意静态服务器即可，无需后端：

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/colortest;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 其他方式

- **静态托管**：GitHub Pages / Vercel / Netlify / Cloudflare Pages 等，直接上传即可。
- **任意 HTTP 服务**：Apache、Caddy、对象存储静态站点等均可。
