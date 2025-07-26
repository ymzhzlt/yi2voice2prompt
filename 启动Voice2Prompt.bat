@echo off
title Voice2Prompt 语音转文字工具
echo 启动 Voice2Prompt...
start "" "src-tauri\target\debug\voice2prompt.exe"
echo Voice2Prompt 已启动！
timeout /t 2 /nobreak >nul
