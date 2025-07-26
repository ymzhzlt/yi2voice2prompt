# Voice2Prompt

Voice2Prompt 是一个基于 Tauri + React 的桌面应用，使用 OpenAI Whisper API 进行语音转文字，并通过 GPT 进行文本格式化。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

在 `.env` 文件中填入你的 OpenAI API Key：

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
NO_UPLOAD=0
```

### 3. 运行开发环境

```bash
pnpm tauri:dev
```

### 4. 构建应用

```bash
pnpm tauri:build
```

## 功能特性

- 🎤 **全局快捷键**: 按 `Ctrl + Alt + R` 开始/停止录音
- 🔊 **音频录制**: 使用系统麦克风录制高质量音频
- 🤖 **AI 转写**: OpenAI Whisper API 语音转文字
- ✨ **智能格式化**: GPT-4o-mini 整理文本格式
- 📋 **自动复制**: 自动复制到剪贴板，支持 Ctrl+V 粘贴
- 🖥️ **系统托盘**: 最小化到系统托盘
- 🔒 **隐私保护**: 可选离线模式，音频不保存

## 使用方法

1. **启动应用**: 运行后会显示浮窗界面
2. **设置 API Key**: 在界面中输入 OpenAI API Key
3. **开始录音**: 点击录音按钮或按 `Ctrl + Alt + R`
4. **说话**: 说出要转换的内容
5. **停止录音**: 再次按快捷键或点击停止按钮
6. **自动处理**: 应用会自动转写、格式化并复制到剪贴板
7. **粘贴使用**: 在任意应用中按 `Ctrl + V` 粘贴

## 技术栈

- **桌面容器**: Tauri (Rust)
- **前端框架**: React + TypeScript
- **UI 样式**: CSS3 + 自定义组件
- **音频处理**: cpal + hound (Rust)
- **语音转写**: OpenAI Whisper API
- **文本格式化**: OpenAI GPT-4o-mini
- **系统集成**: 全局快捷键、系统托盘、剪贴板

## 项目结构

```
voice2prompt/
├── src-tauri/          # Rust 后端
│   ├── src/
│   │   ├── main.rs     # 主程序入口
│   │   └── audio.rs    # 音频处理模块
│   ├── Cargo.toml      # Rust 依赖配置
│   └── tauri.conf.json # Tauri 配置
├── src/                # React 前端
│   ├── lib/
│   │   ├── audio.ts    # 音频工具
│   │   ├── format.ts   # 文本格式化
│   │   └── paste.ts    # 剪贴板操作
│   ├── config/
│   │   └── defaults.json # 默认配置
│   ├── App.tsx         # 主组件
│   ├── main.tsx        # 入口文件
│   └── styles.css      # 样式文件
├── scripts/
│   └── demo-record.ts  # CLI 演示脚本
├── package.json        # 前端依赖
└── .env.example        # 环境变量模板
```

## CLI 脚本

运行 5 秒录音演示：

```bash
pnpm demo-record 5
```

## 配置选项

### 音频设置
- 采样率: 16kHz
- 声道: 单声道
- 位深: 16-bit
- 最大录音时长: 30秒

### API 设置
- Whisper 模型: whisper-1
- GPT 模型: gpt-4o-mini
- 请求超时: 30秒

### 安全设置
- CSP 策略: 仅允许 OpenAI API 域名
- 离线模式: 设置 `NO_UPLOAD=1`
- 音频缓存: 默认关闭

## 故障排除

### 常见问题

1. **录音权限**: 首次使用需要允许麦克风权限
2. **API Key**: 确保正确设置 OpenAI API Key
3. **网络连接**: 需要稳定的网络连接访问 OpenAI API
4. **系统兼容**: 支持 Windows、macOS、Linux

### 错误处理

- **音频设备错误**: 检查麦克风连接和权限
- **API 调用失败**: 验证 API Key 和网络连接
- **格式化错误**: 检查 GPT 模型可用性

## 开发指南

### 开发环境要求
- Node.js 18+
- Rust 1.60+
- pnpm/yarn/npm

### 开发命令
```bash
# 开发模式
pnpm tauri:dev

# 类型检查
pnpm tsc

# 构建
pnpm tauri:build
```

## License

MIT License
