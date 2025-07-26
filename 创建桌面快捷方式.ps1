# 创建桌面快捷方式
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$TargetFile = "$PWD\src-tauri\target\debug\voice2prompt.exe"
$ShortcutFile = "$DesktopPath\Voice2Prompt 语音转文字.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutFile)
$Shortcut.TargetPath = $TargetFile
$Shortcut.WorkingDirectory = Split-Path $TargetFile
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Voice2Prompt 语音转文字工具"
$Shortcut.Save()
Write-Host "桌面快捷方式已创建：$ShortcutFile" -ForegroundColor Green
