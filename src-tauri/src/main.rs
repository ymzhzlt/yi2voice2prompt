// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, GlobalShortcutManager};
use tauri_plugin_positioner::{Position, WindowExt};

mod audio;

#[derive(Default)]
struct AppState {
    is_recording: Mutex<bool>,
}

#[tauri::command]
async fn start_recording(_app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    {
        let mut is_recording = state.is_recording.lock().unwrap();
        if *is_recording {
            return Err("Already recording".into());
        }
        *is_recording = true;
    } // MutexGuard 在这里被释放
    
    // Start audio recording
    match audio::start_recording().await {
        Ok(_) => {
            println!("Recording started");
            Ok(())
        }
        Err(e) => {
            // 如果失败，重置状态
            {
                let mut is_recording = state.is_recording.lock().unwrap();
                *is_recording = false;
            }
            Err(format!("Failed to start recording: {}", e))
        }
    }
}

#[tauri::command]
async fn stop_recording(_app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<String, String> {
    {
        let mut is_recording = state.is_recording.lock().unwrap();
        if !*is_recording {
            return Err("Not recording".into());
        }
        *is_recording = false;
    } // MutexGuard 在这里被释放
    
    // Stop recording and get file path
    match audio::stop_recording().await {
        Ok(file_path) => {
            println!("Recording stopped, saved to: {}", file_path);
            Ok(file_path)
        }
        Err(e) => Err(format!("Failed to stop recording: {}", e))
    }
}

#[tauri::command]
async fn transcribe_audio(
    file_path: String, 
    provider: String,
    api_key: String,
    base_url: String,
    whisper_model: String,
    gpt_model: String,
    api_version: Option<String>,
    whisper_deployment: Option<String>,
    gpt_deployment: Option<String>
) -> Result<String, String> {
    let config = audio::AIConfig {
        provider,
        api_key,
        base_url,
        whisper_model,
        gpt_model,
        api_version,
        whisper_deployment,
        gpt_deployment,
    };
    audio::transcribe_audio(file_path, config).await
}

#[tauri::command]
async fn format_text(
    text: String, 
    provider: String,
    api_key: String,
    base_url: String,
    whisper_model: String,
    gpt_model: String,
    api_version: Option<String>,
    whisper_deployment: Option<String>,
    gpt_deployment: Option<String>
) -> Result<String, String> {
    let config = audio::AIConfig {
        provider,
        api_key,
        base_url,
        whisper_model,
        gpt_model,
        api_version,
        whisper_deployment,
        gpt_deployment,
    };
    audio::format_text(text, config).await
}

#[tauri::command]
async fn copy_to_clipboard(text: String) -> Result<(), String> {
    audio::copy_to_clipboard(text).await
}

#[tauri::command]
async fn set_global_shortcut(app_handle: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    let mut shortcut_manager = app_handle.global_shortcut_manager();
    
    // 先注销现有的快捷键
    let _ = shortcut_manager.unregister("Ctrl+Alt+R");
    let _ = shortcut_manager.unregister_all();
    
    // 注册新的快捷键
    let app_handle_clone = app_handle.clone();
    shortcut_manager
        .register(&shortcut, move || {
            let window = app_handle_clone.get_window("main").unwrap();
            let _ = window.emit("global-shortcut-pressed", ());
        })
        .map_err(|e| format!("Failed to register shortcut: {}", e))?;
    
    Ok(())
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "退出程序");
    let hide = CustomMenuItem::new("hide".to_string(), "隐藏窗口");
    let show = CustomMenuItem::new("show".to_string(), "显示主界面");
    let speech_settings = CustomMenuItem::new("speech_settings".to_string(), "设置语音识别接口");
    let text_settings = CustomMenuItem::new("text_settings".to_string(), "设置文本处理接口");
    let shortcut_settings = CustomMenuItem::new("shortcut_settings".to_string(), "设置快捷键");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(speech_settings)
        .add_item(text_settings)
        .add_item(shortcut_settings)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);

    let tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_positioner::init())
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                let _ = window.move_window(Position::TrayCenter);
                let _ = window.show();
                let _ = window.set_focus();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    let _ = window.hide();
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    let _ = window.move_window(Position::TrayCenter);
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                "speech_settings" => {
                    let _ = app.emit_all("open-speech-settings", ());
                }
                "text_settings" => {
                    let _ = app.emit_all("open-text-settings", ());
                }
                "shortcut_settings" => {
                    let _ = app.emit_all("open-shortcut-settings", ());
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            // Register global shortcut Ctrl+Alt+R
            let app_handle = app.handle();
            
            app.global_shortcut_manager()
                .register("Ctrl+Alt+R", move || {
                    let window = app_handle.get_window("main").unwrap();
                    let _ = window.emit("global-shortcut-pressed", ());
                })
                .unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            transcribe_audio,
            format_text,
            copy_to_clipboard,
            set_global_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
