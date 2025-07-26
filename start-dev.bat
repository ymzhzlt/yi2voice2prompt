@echo off
echo Setting up environment for Tauri development...

REM Add Rust to PATH
set PATH=%PATH%;%USERPROFILE%\.cargo\bin

REM Display versions
echo Checking tools...
cargo --version
rustc --version
rustup --version

REM Start Tauri dev
echo Starting Tauri development server...
npx tauri dev
