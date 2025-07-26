# Voice2Prompt 用户指南

## 🎉 恭喜！您的语音转文字工具即将就绪

### 📋 项目概览
Voice2Prompt 是一个智能语音转文字桌面应用，集成了：
- 🎤 实时音频录制
- 🤖 OpenAI Whisper 语音识别
- ✨ GPT 智能文本格式化
- 📋 自动剪贴板操作
- ⌨️ 全局快捷键支持

### 🚀 使用流程
1. **启动应用** - 运行后会出现桌面浮窗
2. **设置 API Key** - 在界面中输入您的 OpenAI API Key
3. **录音操作** - 按 `Ctrl + Alt + R` 开始录音
4. **说话** - 清晰说出要转换的内容
5. **停止录音** - 再次按 `Ctrl + Alt + R` 停止
6. **自动处理** - 应用会自动转写并格式化文本
7. **粘贴使用** - 在任意应用中按 `Ctrl + V` 粘贴结果

### ⚙️ 配置要求
- Windows 10/11 (已测试)
- 麦克风设备
- OpenAI API Key
- 稳定的网络连接

### 🔧 开发命令
```bash
# 开发模式
npm run tauri:dev

# 构建应用
npm run tauri:build

# 演示录音（5秒）
npm run demo-record 5
```

### 📁 项目结构
```
voice2prompt/
├── src-tauri/          # Rust 后端
├── src/                # React 前端
├── scripts/            # 脚本工具
└── README.md           # 项目文档
```

### 🛠️ 故障排除

#### 常见问题
1. **录音权限** - 确保允许麦克风访问权限
2. **API 错误** - 检查 OpenAI API Key 是否正确
3. **网络问题** - 确保能访问 OpenAI API

#### 技术支持
- 检查 `.env` 文件中的 API 配置
- 查看应用日志了解详细错误信息
- 确保系统音频设备正常工作

### 🎯 快速测试
1. 设置 `.env` 文件中的 `OPENAI_API_KEY`
2. 启动应用：`npm run tauri:dev`
3. 按 `Ctrl + Alt + R` 说话测试
4. 查看结果是否自动复制到剪贴板

### 📞 联系方式
如有问题，请查看终端输出或项目 README.md 文件。

---
**🎉 祝您使用愉快！Voice2Prompt 将大大提高您的工作效率！**
