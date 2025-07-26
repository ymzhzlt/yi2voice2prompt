import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import './styles.css';
import './modal-styles.css';

interface AIProvider {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  whisperModel: string;
  gptModel: string;
  supportsWhisper: boolean;
}

interface AppState {
  isRecording: boolean;
  transcribedText: string;
  formattedText: string;
  status: string;
  // 语音转文字配置
  speechProvider: string;
  speechApiKey: string;
  speechBaseUrl: string;
  whisperModel: string;
  speechApiVersion: string;
  whisperDeployment: string;
  // 文本处理配置
  textProvider: string;
  textApiKey: string;
  textBaseUrl: string;
  gptModel: string;
  textApiVersion: string;
  gptDeployment: string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: '官方 OpenAI API',
    baseUrl: 'https://api.openai.com/v1',
    whisperModel: 'whisper-1',
    gptModel: 'gpt-4o-mini',
    supportsWhisper: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '国内 DeepSeek API',
    baseUrl: 'https://api.deepseek.com/v1',
    whisperModel: 'whisper-1',
    gptModel: 'deepseek-chat',
    supportsWhisper: true
  },
  {
    id: 'zhipu',
    name: '智谱AI (GLM)',
    description: '智谱 GLM 系列模型',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    whisperModel: 'whisper-1',
    gptModel: 'glm-4',
    supportsWhisper: true
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    description: 'Moonshot Kimi 模型',
    baseUrl: 'https://api.moonshot.cn/v1',
    whisperModel: 'whisper-1',
    gptModel: 'moonshot-v1-8k',
    supportsWhisper: true
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    description: '微软 Azure OpenAI 服务',
    baseUrl: 'https://your-resource.openai.azure.com',
    whisperModel: 'whisper',
    gptModel: 'gpt-4',
    supportsWhisper: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 模型（仅支持文本格式化）',
    baseUrl: 'https://api.anthropic.com',
    whisperModel: '',
    gptModel: 'claude-3-haiku-20240307',
    supportsWhisper: false
  },
  {
    id: 'ollama',
    name: 'Ollama 本地',
    description: '本地部署的 Ollama 服务',
    baseUrl: 'http://localhost:11434',
    whisperModel: 'whisper:latest',
    gptModel: 'llama3:latest',
    supportsWhisper: true
  }
];

function App() {
  const [state, setState] = useState<AppState>({
    isRecording: false,
    transcribedText: '',
    formattedText: '',
    status: '准备就绪',
    // 语音转文字配置
    speechProvider: localStorage.getItem('speech_provider') || 'openai',
    speechApiKey: localStorage.getItem('speech_api_key') || '',
    speechBaseUrl: localStorage.getItem('speech_base_url') || 'https://api.openai.com/v1',
    whisperModel: localStorage.getItem('whisper_model') || 'whisper-1',
    speechApiVersion: localStorage.getItem('speech_api_version') || '2024-02-01',
    whisperDeployment: localStorage.getItem('whisper_deployment') || 'whisper',
    // 文本处理配置
    textProvider: localStorage.getItem('text_provider') || 'openai',
    textApiKey: localStorage.getItem('text_api_key') || '',
    textBaseUrl: localStorage.getItem('text_base_url') || 'https://api.openai.com/v1',
    gptModel: localStorage.getItem('gpt_model') || 'gpt-4o-mini',
    textApiVersion: localStorage.getItem('text_api_version') || '2024-02-01',
    gptDeployment: localStorage.getItem('gpt_deployment') || 'gpt-4'
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showSpeechDialog, setShowSpeechDialog] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showShortcutDialog, setShowShortcutDialog] = useState(false);

  const currentSpeechProvider = AI_PROVIDERS.find(p => p.id === state.speechProvider) || AI_PROVIDERS[0];
  const currentTextProvider = AI_PROVIDERS.find(p => p.id === state.textProvider) || AI_PROVIDERS[0];

  useEffect(() => {
    // Listen for global shortcut events
    const unlistenShortcut = listen('global-shortcut-pressed', () => {
      if (!state.isRecording) {
        handleStartRecording();
      } else {
        handleStopRecording();
      }
    });

    // Listen for tray menu events
    const unlistenSpeechSettings = listen('open-speech-settings', () => {
      setShowSpeechDialog(true);
    });

    const unlistenTextSettings = listen('open-text-settings', () => {
      setShowTextDialog(true);
    });

    const unlistenShortcutSettings = listen('open-shortcut-settings', () => {
      setShowShortcutDialog(true);
    });

    return () => {
      unlistenShortcut.then(fn => fn());
      unlistenSpeechSettings.then(fn => fn());
      unlistenTextSettings.then(fn => fn());
      unlistenShortcutSettings.then(fn => fn());
    };
  }, [state.isRecording]);

  const handleStartRecording = async () => {
    if (!state.speechApiKey) {
      setState(prev => ({ ...prev, status: `请先设置语音识别 ${currentSpeechProvider.name} API Key` }));
      return;
    }

    if (!currentSpeechProvider.supportsWhisper && state.speechProvider === 'anthropic') {
      setState(prev => ({ ...prev, status: 'Claude 不支持语音转录，请选择支持 Whisper 的服务' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isRecording: true, status: '正在录音...' }));
      await invoke('start_recording');
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        status: `录音失败: ${error}` 
      }));
    }
  };

  const handleStopRecording = async () => {
    try {
      setState(prev => ({ ...prev, status: '正在处理录音...' }));
      
      // Stop recording and get file path
      const filePath = await invoke<string>('stop_recording');
      setState(prev => ({ ...prev, isRecording: false, status: '正在转写...' }));

      // Transcribe audio
      const transcribedText = await invoke<string>('transcribe_audio', {
        filePath,
        provider: state.speechProvider,
        apiKey: state.speechApiKey,
        baseUrl: state.speechBaseUrl,
        whisperModel: state.whisperModel,
        gptModel: state.gptModel,
        apiVersion: state.speechProvider === 'azure' ? state.speechApiVersion : null,
        whisperDeployment: state.speechProvider === 'azure' ? state.whisperDeployment : null,
        gptDeployment: state.speechProvider === 'azure' ? state.gptDeployment : null
      });
      
      setState(prev => ({ 
        ...prev, 
        transcribedText, 
        status: '正在格式化...' 
      }));

      // Format text
      const formattedText = await invoke<string>('format_text', {
        text: transcribedText,
        provider: state.textProvider,
        apiKey: state.textApiKey,
        baseUrl: state.textBaseUrl,
        whisperModel: state.whisperModel,
        gptModel: state.gptModel,
        apiVersion: state.textProvider === 'azure' ? state.textApiVersion : null,
        whisperDeployment: state.textProvider === 'azure' ? state.whisperDeployment : null,
        gptDeployment: state.textProvider === 'azure' ? state.gptDeployment : null
      });

      setState(prev => ({ 
        ...prev, 
        formattedText, 
        status: '正在复制到剪贴板...' 
      }));

      // Copy to clipboard
      await invoke('copy_to_clipboard', { text: formattedText });
      
      setState(prev => ({ 
        ...prev, 
        status: '完成！已复制到剪贴板，可以 Ctrl+V 粘贴' 
      }));

      // Auto clear status after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, status: '准备就绪' }));
      }, 3000);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        status: `处理失败: ${error}` 
      }));
    }
  };

  const handleSpeechProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      setState(prev => ({ 
        ...prev, 
        speechProvider: providerId,
        speechBaseUrl: provider.baseUrl,
        whisperModel: provider.whisperModel
      }));
      localStorage.setItem('speech_provider', providerId);
      localStorage.setItem('speech_base_url', provider.baseUrl);
      localStorage.setItem('whisper_model', provider.whisperModel);
    }
  };

  const handleTextProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      setState(prev => ({ 
        ...prev, 
        textProvider: providerId,
        textBaseUrl: provider.baseUrl,
        gptModel: provider.gptModel
      }));
      localStorage.setItem('text_provider', providerId);
      localStorage.setItem('text_base_url', provider.baseUrl);
      localStorage.setItem('gpt_model', provider.gptModel);
    }
  };

  const handleConfigChange = (field: keyof AppState, value: string) => {
    setState(prev => ({ ...prev, [field]: value }));
    localStorage.setItem(field.replace(/([A-Z])/g, '_$1').toLowerCase(), value);
  };

  const handleShortcutChange = async (newShortcut: string) => {
    try {
      await invoke('set_global_shortcut', { shortcut: newShortcut });
      localStorage.setItem('global_shortcut', newShortcut);
      setState(prev => ({ ...prev, status: `快捷键已设置为：${newShortcut}` }));
      setShowShortcutDialog(false);
      
      // Auto clear status after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, status: '准备就绪' }));
      }, 3000);
    } catch (error) {
      setState(prev => ({ ...prev, status: `设置快捷键失败：${error}` }));
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🎤 Voice2Prompt</h1>
        <p className="subtitle">按 Ctrl+Alt+R 开始录音</p>
      </div>

      <div className="content">
        <div className="status-section">
          <div className={`status ${state.isRecording ? 'recording' : ''}`}>
            {state.status}
          </div>
          
          {state.isRecording && (
            <div className="recording-indicator">
              <div className="pulse"></div>
              录音中...
            </div>
          )}
        </div>

        <div className="controls">
          <button
            className={`record-btn ${state.isRecording ? 'recording' : ''}`}
            onClick={state.isRecording ? handleStopRecording : handleStartRecording}
            disabled={!state.speechApiKey}
          >
            {state.isRecording ? '停止录音' : '开始录音'}
          </button>

          <button
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ 设置
          </button>
        </div>

        {showSettings && (
          <div className="settings">
            {/* 语音识别配置 */}
            <div className="provider-section">
              <h3>🎤 语音识别配置</h3>
              
              <div className="setting-group">
                <label htmlFor="speech-provider">语音服务提供商:</label>
                <select
                  id="speech-provider"
                  value={state.speechProvider}
                  onChange={handleSpeechProviderChange}
                  className="provider-select"
                >
                  {AI_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="speech-api-key">语音 API Key:</label>
                <input
                  id="speech-api-key"
                  type="password"
                  value={state.speechApiKey}
                  onChange={(e) => handleConfigChange('speechApiKey', e.target.value)}
                  placeholder={`输入你的 ${currentSpeechProvider.name} API Key`}
                  className="config-input"
                />
              </div>

              <div className="setting-group">
                <label htmlFor="speech-base-url">语音 API 基础 URL:</label>
                <input
                  id="speech-base-url"
                  type="text"
                  value={state.speechBaseUrl}
                  onChange={(e) => handleConfigChange('speechBaseUrl', e.target.value)}
                  placeholder="语音 API 基础 URL"
                  className="config-input"
                />
              </div>

              <div className="setting-group">
                <label htmlFor="whisper-model">语音模型:</label>
                <input
                  id="whisper-model"
                  type="text"
                  value={state.whisperModel}
                  onChange={(e) => handleConfigChange('whisperModel', e.target.value)}
                  placeholder="Whisper 模型"
                  className="config-input"
                  disabled={!currentSpeechProvider.supportsWhisper}
                />
              </div>

              {state.speechProvider === 'azure' && (
                <>
                  <div className="setting-group">
                    <label htmlFor="speech-api-version">语音 API 版本:</label>
                    <input
                      id="speech-api-version"
                      type="text"
                      value={state.speechApiVersion}
                      onChange={(e) => handleConfigChange('speechApiVersion', e.target.value)}
                      placeholder="API 版本"
                      className="config-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label htmlFor="whisper-deployment">Whisper 部署:</label>
                    <input
                      id="whisper-deployment"
                      type="text"
                      value={state.whisperDeployment}
                      onChange={(e) => handleConfigChange('whisperDeployment', e.target.value)}
                      placeholder="Whisper 部署名称"
                      className="config-input"
                    />
                  </div>
                </>
              )}

              <div className="provider-info">
                <h4>语音识别: {currentSpeechProvider.name}</h4>
                <p>{currentSpeechProvider.description}</p>
                {!currentSpeechProvider.supportsWhisper && (
                  <p className="warning">⚠️ 此服务不支持语音转录功能</p>
                )}
              </div>
            </div>

            {/* 文本处理配置 */}
            <div className="provider-section">
              <h3>📝 文本处理配置</h3>
              
              <div className="setting-group">
                <label htmlFor="text-provider">文本服务提供商:</label>
                <select
                  id="text-provider"
                  value={state.textProvider}
                  onChange={handleTextProviderChange}
                  className="provider-select"
                >
                  {AI_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="text-api-key">文本 API Key:</label>
                <input
                  id="text-api-key"
                  type="password"
                  value={state.textApiKey}
                  onChange={(e) => handleConfigChange('textApiKey', e.target.value)}
                  placeholder={`输入你的 ${currentTextProvider.name} API Key`}
                  className="config-input"
                />
              </div>

              <div className="setting-group">
                <label htmlFor="text-base-url">文本 API 基础 URL:</label>
                <input
                  id="text-base-url"
                  type="text"
                  value={state.textBaseUrl}
                  onChange={(e) => handleConfigChange('textBaseUrl', e.target.value)}
                  placeholder="文本 API 基础 URL"
                  className="config-input"
                />
              </div>

              <div className="setting-group">
                <label htmlFor="gpt-model">文本模型:</label>
                <input
                  id="gpt-model"
                  type="text"
                  value={state.gptModel}
                  onChange={(e) => handleConfigChange('gptModel', e.target.value)}
                  placeholder="GPT 模型"
                  className="config-input"
                />
              </div>

              {state.textProvider === 'azure' && (
                <>
                  <div className="setting-group">
                    <label htmlFor="text-api-version">文本 API 版本:</label>
                    <input
                      id="text-api-version"
                      type="text"
                      value={state.textApiVersion}
                      onChange={(e) => handleConfigChange('textApiVersion', e.target.value)}
                      placeholder="API 版本"
                      className="config-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label htmlFor="gpt-deployment">GPT 部署:</label>
                    <input
                      id="gpt-deployment"
                      type="text"
                      value={state.gptDeployment}
                      onChange={(e) => handleConfigChange('gptDeployment', e.target.value)}
                      placeholder="GPT 部署名称"
                      className="config-input"
                    />
                  </div>
                </>
              )}

              <div className="provider-info">
                <h4>文本处理: {currentTextProvider.name}</h4>
                <p>{currentTextProvider.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* 语音设置对话框 */}
        {showSpeechDialog && (
          <div className="modal-overlay" onClick={() => setShowSpeechDialog(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <h3>🎤 快速设置语音识别接口</h3>
              <div className="quick-setting-group">
                <label>提供商:</label>
                <select
                  value={state.speechProvider}
                  onChange={handleSpeechProviderChange}
                  className="config-input"
                >
                  {AI_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="quick-setting-group">
                <label>API Key:</label>
                <input
                  type="password"
                  value={state.speechApiKey}
                  onChange={(e) => handleConfigChange('speechApiKey', e.target.value)}
                  placeholder="输入语音识别 API Key"
                  className="config-input"
                />
              </div>
              <div className="quick-setting-group">
                <label>接口地址:</label>
                <input
                  type="text"
                  value={state.speechBaseUrl}
                  onChange={(e) => handleConfigChange('speechBaseUrl', e.target.value)}
                  placeholder="输入接口地址"
                  className="config-input"
                />
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowSpeechDialog(false)} className="btn-secondary">
                  取消
                </button>
                <button onClick={() => setShowSpeechDialog(false)} className="btn-primary">
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 文本设置对话框 */}
        {showTextDialog && (
          <div className="modal-overlay" onClick={() => setShowTextDialog(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <h3>📝 快速设置文本处理接口</h3>
              <div className="quick-setting-group">
                <label>提供商:</label>
                <select
                  value={state.textProvider}
                  onChange={handleTextProviderChange}
                  className="config-input"
                >
                  {AI_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="quick-setting-group">
                <label>API Key:</label>
                <input
                  type="password"
                  value={state.textApiKey}
                  onChange={(e) => handleConfigChange('textApiKey', e.target.value)}
                  placeholder="输入文本处理 API Key"
                  className="config-input"
                />
              </div>
              <div className="quick-setting-group">
                <label>接口地址:</label>
                <input
                  type="text"
                  value={state.textBaseUrl}
                  onChange={(e) => handleConfigChange('textBaseUrl', e.target.value)}
                  placeholder="输入接口地址"
                  className="config-input"
                />
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowTextDialog(false)} className="btn-secondary">
                  取消
                </button>
                <button onClick={() => setShowTextDialog(false)} className="btn-primary">
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 快捷键设置对话框 */}
        {showShortcutDialog && (
          <div className="modal-overlay" onClick={() => setShowShortcutDialog(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <h3>⌨️ 设置快捷键</h3>
              <div className="quick-setting-group">
                <label>当前快捷键:</label>
                <input
                  type="text"
                  defaultValue={localStorage.getItem('global_shortcut') || 'Ctrl+Alt+R'}
                  placeholder="例如: Ctrl+1, Alt+Shift+V"
                  className="config-input"
                  onKeyDown={(e) => {
                    e.preventDefault();
                    const key = e.key;
                    const modifiers = [];
                    if (e.ctrlKey) modifiers.push('Ctrl');
                    if (e.altKey) modifiers.push('Alt');
                    if (e.shiftKey) modifiers.push('Shift');
                    if (e.metaKey) modifiers.push('Cmd');
                    
                    if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') {
                      const shortcut = [...modifiers, key].join('+');
                      (e.target as HTMLInputElement).value = shortcut;
                    }
                  }}
                />
              </div>
              <div className="shortcut-hint">
                <p>💡 提示：按住修饰键（Ctrl/Alt/Shift）+ 其他键来设置快捷键</p>
                <p>例如：Ctrl+1, Alt+Space, Ctrl+Alt+V 等</p>
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowShortcutDialog(false)} className="btn-secondary">
                  取消
                </button>
                <button 
                  onClick={() => {
                    const input = document.querySelector('.modal-dialog input') as HTMLInputElement;
                    const shortcut = input.value.trim();
                    if (shortcut) {
                      handleShortcutChange(shortcut);
                    }
                  }} 
                  className="btn-primary"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {state.transcribedText && (
          <div className="result-section">
            <h3>原始转写:</h3>
            <div className="text-box">{state.transcribedText}</div>
          </div>
        )}

        {state.formattedText && (
          <div className="result-section">
            <h3>格式化结果:</h3>
            <div className="text-box formatted">{state.formattedText}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
