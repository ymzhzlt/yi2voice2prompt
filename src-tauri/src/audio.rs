use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use hound::WavWriter;
use std::sync::{Arc, Mutex};
use std::time::SystemTime;
use serde_json::Value;

static mut RECORDING_STREAM: Option<cpal::Stream> = None;
static mut WAV_WRITER: Option<Arc<Mutex<WavWriter<std::io::BufWriter<std::fs::File>>>>> = None;
static mut CURRENT_FILE_PATH: Option<String> = None;

#[derive(Debug, Clone)]
pub struct AIConfig {
    pub provider: String,
    pub api_key: String,
    pub base_url: String,
    pub whisper_model: String,
    pub gpt_model: String,
    pub api_version: Option<String>,
    pub whisper_deployment: Option<String>,
    pub gpt_deployment: Option<String>,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            api_key: String::new(),
            base_url: "https://api.openai.com/v1".to_string(),
            whisper_model: "whisper-1".to_string(),
            gpt_model: "gpt-4o-mini".to_string(),
            api_version: None,
            whisper_deployment: None,
            gpt_deployment: None,
        }
    }
}

pub async fn start_recording() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No input device available")?;

    let config = device.default_input_config()?;
    
    // Create output file with timestamp in the current directory
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs();
    let file_path = std::env::current_dir()?
        .join(format!("recording_{}.wav", timestamp))
        .to_string_lossy()
        .to_string();
    
    let spec = hound::WavSpec {
        channels: config.channels(),
        sample_rate: config.sample_rate().0,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    
    let writer = WavWriter::create(&file_path, spec)?;
    let writer = Arc::new(Mutex::new(writer));
    let writer_clone = writer.clone();
    
    unsafe {
        WAV_WRITER = Some(writer);
        CURRENT_FILE_PATH = Some(file_path);
    }
    
    let stream = device.build_input_stream(
        &config.into(),
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            if let Ok(mut writer) = writer_clone.lock() {
                for &sample in data {
                    let sample = (sample * i16::MAX as f32) as i16;
                    let _ = writer.write_sample(sample);
                }
            }
        },
        |err| eprintln!("An error occurred on the input audio stream: {}", err),
        None
    )?;

    stream.play()?;
    
    unsafe {
        RECORDING_STREAM = Some(stream);
    }
    
    Ok(())
}

pub async fn stop_recording() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let file_path = unsafe {
        if let Some(stream) = RECORDING_STREAM.take() {
            drop(stream);
        }
        
        if let Some(writer_arc) = WAV_WRITER.take() {
            // 获取 Arc 内部的 writer 并 finalize
            let writer = Arc::try_unwrap(writer_arc)
                .map_err(|_| "Failed to unwrap writer")?
                .into_inner()
                .map_err(|_| "Failed to get writer from mutex")?;
            writer.finalize()?;
        }
        
        // 返回保存的文件路径
        CURRENT_FILE_PATH.take().ok_or("No file path recorded")?
    };
    
    Ok(file_path)
}

pub async fn transcribe_audio(file_path: String, config: AIConfig) -> Result<String, String> {
    match config.provider.as_str() {
        "openai" => transcribe_openai(file_path, config).await,
        "deepseek" => transcribe_deepseek(file_path, config).await,
        "zhipu" => transcribe_zhipu(file_path, config).await,
        "moonshot" => transcribe_moonshot(file_path, config).await,
        "azure" => transcribe_azure(file_path, config).await,
        "ollama" => transcribe_ollama(file_path, config).await,
        _ => Err(format!("Unsupported AI provider: {}", config.provider)),
    }
}

async fn transcribe_openai(file_path: String, config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Read the audio file
    let audio_data = std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;
    
    // Create multipart form
    let form = reqwest::multipart::Form::new()
        .text("model", config.whisper_model)
        .text("language", "zh")
        .text("response_format", "json")
        .part("file", reqwest::multipart::Part::bytes(audio_data)
            .file_name("audio.wav")
            .mime_str("audio/wav").unwrap());
    
    let url = format!("{}/audio/transcriptions", config.base_url);
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let text = json["text"].as_str()
        .ok_or("No text in response")?
        .to_string();
    
    // Clean up the audio file
    let _ = std::fs::remove_file(&file_path);
    
    Ok(text)
}

async fn transcribe_deepseek(file_path: String, config: AIConfig) -> Result<String, String> {
    // DeepSeek 使用与 OpenAI 兼容的接口
    transcribe_openai(file_path, config).await
}

async fn transcribe_zhipu(file_path: String, config: AIConfig) -> Result<String, String> {
    // 智谱AI GLM 使用与 OpenAI 兼容的接口
    transcribe_openai(file_path, config).await
}

async fn transcribe_moonshot(file_path: String, config: AIConfig) -> Result<String, String> {
    // Moonshot 使用与 OpenAI 兼容的接口
    transcribe_openai(file_path, config).await
}

async fn transcribe_azure(file_path: String, config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Read the audio file
    let audio_data = std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;
    
    // Create multipart form
    let form = reqwest::multipart::Form::new()
        .text("language", "zh")
        .text("response_format", "json")
        .part("file", reqwest::multipart::Part::bytes(audio_data)
            .file_name("audio.wav")
            .mime_str("audio/wav").unwrap());
    
    let deployment = config.whisper_deployment.as_deref().unwrap_or("whisper");
    let api_version = config.api_version.as_deref().unwrap_or("2024-02-01");
    let url = format!("{}/openai/deployments/{}/audio/transcriptions?api-version={}", 
                     config.base_url, deployment, api_version);
    
    let response = client
        .post(&url)
        .header("api-key", config.api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let text = json["text"].as_str()
        .ok_or("No text in response")?
        .to_string();
    
    // Clean up the audio file
    let _ = std::fs::remove_file(&file_path);
    
    Ok(text)
}

async fn transcribe_ollama(file_path: String, config: AIConfig) -> Result<String, String> {
    // Ollama 本地部署的 Whisper 模型
    let client = reqwest::Client::new();
    
    // Read the audio file
    let audio_data = std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;
    
    // Create multipart form
    let form = reqwest::multipart::Form::new()
        .text("model", config.whisper_model)
        .text("language", "zh")
        .text("response_format", "json")
        .part("file", reqwest::multipart::Part::bytes(audio_data)
            .file_name("audio.wav")
            .mime_str("audio/wav").unwrap());
    
    let url = format!("{}/v1/audio/transcriptions", config.base_url);
    let response = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let text = json["text"].as_str()
        .ok_or("No text in response")?
        .to_string();
    
    // Clean up the audio file
    let _ = std::fs::remove_file(&file_path);
    
    Ok(text)
}

pub async fn format_text(text: String, config: AIConfig) -> Result<String, String> {
    match config.provider.as_str() {
        "openai" => format_text_openai(text, config).await,
        "deepseek" => format_text_deepseek(text, config).await,
        "zhipu" => format_text_zhipu(text, config).await,
        "moonshot" => format_text_moonshot(text, config).await,
        "azure" => format_text_azure(text, config).await,
        "anthropic" => format_text_anthropic(text, config).await,
        "ollama" => format_text_ollama(text, config).await,
        _ => Err(format!("Unsupported AI provider: {}", config.provider)),
    }
}

async fn format_text_openai(text: String, config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let messages = serde_json::json!([
        {
            "role": "system",
            "content": "你是专业的中文文本清理工具。请将语音转写的文本进行清理：1）如果输入是英文但内容是中文意思，请直接翻译成对应的中文；2）删除语气词（嗯、啊、那个等）；3）去除重复词语；4）修正语法错误；5）保持原意不变，不要添加任何新内容；6）输出简洁的中文文本，不要使用Markdown格式。特别注意：如果输入的英文明显是中文语音的错误识别结果，请直接转换为正确的中文表达。"
        },
        {
            "role": "user",
            "content": text
        }
    ]);
    
    let request_body = serde_json::json!({
        "model": config.gpt_model,
        "messages": messages,
        "temperature": 0.3
    });
    
    let url = format!("{}/chat/completions", config.base_url);
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let formatted_text = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("No content in response")?
        .to_string();
    
    Ok(formatted_text)
}

async fn format_text_deepseek(text: String, config: AIConfig) -> Result<String, String> {
    // DeepSeek 使用与 OpenAI 兼容的接口
    format_text_openai(text, config).await
}

async fn format_text_zhipu(text: String, config: AIConfig) -> Result<String, String> {
    // 智谱AI GLM 使用与 OpenAI 兼容的接口
    format_text_openai(text, config).await
}

async fn format_text_moonshot(text: String, config: AIConfig) -> Result<String, String> {
    // Moonshot 使用与 OpenAI 兼容的接口
    format_text_openai(text, config).await
}

async fn format_text_azure(text: String, config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let messages = serde_json::json!([
        {
            "role": "system",
            "content": "你是专业的中文文本清理工具。请将语音转写的文本进行清理：1）如果输入是英文但内容是中文意思，请直接翻译成对应的中文；2）删除语气词（嗯、啊、那个等）；3）去除重复词语；4）修正语法错误；5）保持原意不变，不要添加任何新内容；6）输出简洁的中文文本，不要使用Markdown格式。特别注意：如果输入的英文明显是中文语音的错误识别结果，请直接转换为正确的中文表达。"
        },
        {
            "role": "user",
            "content": text
        }
    ]);
    
    let request_body = serde_json::json!({
        "messages": messages,
        "temperature": 0.3
    });
    
    let deployment = config.gpt_deployment.as_deref().unwrap_or("gpt-4");
    let api_version = config.api_version.as_deref().unwrap_or("2024-02-01");
    let url = format!("{}/openai/deployments/{}/chat/completions?api-version={}", 
                     config.base_url, deployment, api_version);
    
    let response = client
        .post(&url)
        .header("api-key", config.api_key)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let formatted_text = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("No content in response")?
        .to_string();
    
    Ok(formatted_text)
}

async fn format_text_anthropic(text: String, config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let request_body = serde_json::json!({
        "model": config.gpt_model,
        "max_tokens": 1024,
        "system": "你是专业的中文文本清理工具。请将语音转写的文本进行清理：1）如果输入是英文但内容是中文意思，请直接翻译成对应的中文；2）删除语气词（嗯、啊、那个等）；3）去除重复词语；4）修正语法错误；5）保持原意不变，不要添加任何新内容；6）输出简洁的中文文本，不要使用Markdown格式。特别注意：如果输入的英文明显是中文语音的错误识别结果，请直接转换为正确的中文表达。",
        "messages": [
            {
                "role": "user",
                "content": text
            }
        ]
    });
    
    let url = format!("{}/v1/messages", config.base_url);
    let response = client
        .post(&url)
        .header("x-api-key", config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let formatted_text = json["content"][0]["text"]
        .as_str()
        .ok_or("No content in response")?
        .to_string();
    
    Ok(formatted_text)
}

async fn format_text_ollama(text: String, config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let messages = serde_json::json!([
        {
            "role": "system",
            "content": "你是专业的中文文本清理工具。请将语音转写的文本进行清理：1）如果输入是英文但内容是中文意思，请直接翻译成对应的中文；2）删除语气词（嗯、啊、那个等）；3）去除重复词语；4）修正语法错误；5）保持原意不变，不要添加任何新内容；6）输出简洁的中文文本，不要使用Markdown格式。特别注意：如果输入的英文明显是中文语音的错误识别结果，请直接转换为正确的中文表达。"
        },
        {
            "role": "user",
            "content": text
        }
    ]);
    
    let request_body = serde_json::json!({
        "model": config.gpt_model,
        "messages": messages,
        "stream": false
    });
    
    let url = format!("{}/v1/chat/completions", config.base_url);
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let formatted_text = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("No content in response")?
        .to_string();
    
    Ok(formatted_text)
}

pub async fn copy_to_clipboard(text: String) -> Result<(), String> {
    use std::process::Command;
    
    // Use Windows clipboard command
    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("powershell")
            .arg("-Command")
            .arg(format!("Set-Clipboard -Value '{}'", text.replace("'", "''")))
            .spawn()
            .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
        
        cmd.wait().map_err(|e| format!("Clipboard command failed: {}", e))?;
    }
    
    // Use macOS clipboard command
    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
        
        if let Some(stdin) = cmd.stdin.as_mut() {
            use std::io::Write;
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
        }
        
        cmd.wait().map_err(|e| format!("Clipboard command failed: {}", e))?;
    }
    
    // Use Linux clipboard command
    #[cfg(target_os = "linux")]
    {
        let mut cmd = Command::new("xclip")
            .arg("-selection")
            .arg("clipboard")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
        
        if let Some(stdin) = cmd.stdin.as_mut() {
            use std::io::Write;
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
        }
        
        cmd.wait().map_err(|e| format!("Clipboard command failed: {}", e))?;
    }
    
    Ok(())
}
