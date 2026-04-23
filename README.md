# Point Cloud Personal Website

## 功能
- 点云风格主页（summary + 个人介绍 + AI 搜索）
- 项目展示支持文字、图片和文件
- 个人 `admin` 编辑台，可编辑主页资料
- AI 输入框可将项目内容自动打包为页面并分类
- 支持上传多文件与图片作为项目素材

## 本地运行
1. 安装依赖：`npm install`
2. 复制环境变量：`.env.example` -> `.env`
3. 按需填写：
   - `OPENAI_API_KEY`（可选，不填则使用 fallback）
   - `OPENAI_MODEL`
   - `ADMIN_TOKEN`
4. 启动：`npm run dev`
5. 访问：
   - 主页：`http://localhost:3000`
   - 编辑台：`http://localhost:3000/admin`

## 数据说明
- 站点数据保存在 `data/site-data.json`
- 上传文件保存在 `uploads/`
- `uploads/` 已在 `.gitignore`，不会被提交
