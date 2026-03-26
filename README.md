# TTS实验助手平台

## 项目简介

TTS实验助手平台是一个基于Web技术的语音合成实验工具，专为研究医院自助终端语音用户界面工效学适老化研究设计。该平台提供丰富的语音参数调节功能，支持噪音环境模拟和音频评估，帮助研究人员和设计师优化语音界面设计，提升老年用户的使用体验。

## 功能特点

### 1. 语音参数调节

- **基础参数**：语速、音调、音量
- **语音选择**：7种不同年龄和性别的语音
- **音频效果**：低音、高音、混响调节
- **情感与音色**：5种情感状态和5种音色类型
- **语言处理**：停顿时间和重音设置
- **适老化EQ**：针对老年人听力特征优化

### 2. 噪音环境模拟

- 支持上传真实噪音文件
- 可调节语音与噪音的音量比例
- 自动计算信噪比(SNR)并评估可听性
- 提供参数调整建议

### 3. 实验管理

- 支持创建多个实验方案
- 批量运行并对比结果
- 生成详细的实验报告

### 4. 实时预览与控制

- 实时预览生成的语音效果
- 提供完整的播放控制功能
- 即时反馈参数调整效果

## 技术栈

- **前端**：React + TypeScript + Vite
- **后端**：Node.js + Express
- **音频处理**：Web Speech API + FFmpeg

## 快速开始

### 1. 安装依赖

#### 后端依赖

```bash
cd backend
npm install
```

#### 前端依赖

```bash
cd frontend
npm install
```

### 2. 启动服务

#### 启动后端服务

```bash
cd backend
npm start
# 服务将运行在 http://localhost:3001
```

#### 启动前端服务

```bash
cd frontend
npm run dev
# 服务将运行在 http://localhost:5173
```

### 3. 使用指南

1. 在浏览器中打开 `http://localhost:5173`
2. 在文本输入框中输入要转换的文本
3. 调整语音参数
4. 点击"生成语音"按钮生成并播放语音
5. 上传噪音文件并调整音量比例
6. 点击"混合音频"按钮混合语音和噪音
7. 点击"评估音频"按钮评估可听性
8. 在实验模式中创建和运行实验

## 项目结构

```
tts-platform/
├── backend/              # 后端服务
│   ├── public/           # 静态文件
│   │   └── audio/        # 音频文件存储
│   ├── index.js          # 后端主文件
│   ├── package.json      # 后端依赖
│   └── package-lock.json # 依赖锁定文件
├── frontend/             # 前端应用
│   ├── public/           # 静态资源
│   ├── src/              # 源代码
│   │   ├── assets/       # 静态资源
│   │   ├── App.tsx       # 主组件
│   │   ├── App.css       # 样式文件
│   │   └── main.tsx      # 入口文件
│   ├── package.json      # 前端依赖
│   └── package-lock.json # 依赖锁定文件
└── README.md             # 项目说明
```

## 上传到GitHub

### 1. 初始化Git仓库

```bash
cd tts-platform
git init
git add .
git commit -m "Initial commit"
```

### 2. 创建GitHub仓库

1. 登录GitHub
2. 点击"New repository"
3. 输入仓库名称（如"tts-experiment-helper"）
4. 选择公开或私有
5. 点击"Create repository"

### 3. 关联本地仓库与GitHub仓库

```bash
git remote add origin https://github.com/your-username/tts-experiment-helper.git
git branch -M main
git push -u origin main
```

### 4. 推送代码

```bash
git add .
git commit -m "Update: Add new features"
git push
```

## 注意事项

- 确保Node.js版本 >= 14.0.0
- 后端服务需要FFmpeg支持，依赖会自动安装
- 前端服务需要现代浏览器支持Web Speech API
- 上传的噪音文件建议使用WAV或MP3格式

## 未来规划

- 集成更多TTS引擎
- 增加语音质量客观评估指标
- 引入机器学习算法自动优化语音参数
- 开发移动应用版本
- 制定适老化语音界面设计标准

## 贡献

欢迎提交Issue和Pull Request，共同改进这个项目。

## 许可证

MIT License
