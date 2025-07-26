import axios from 'axios';

export const FORMAT_PROMPT = (raw: string) => [
  { 
    role: 'system', 
    content: `你是专业的 Markdown 整理器，只输出中文。请将用户的语音转写文本整理成清晰、格式化的 Markdown 文本。

规则：
1. 保持原意不变
2. 纠正语音识别错误
3. 添加适当的标点符号
4. 使用 Markdown 格式（如标题、列表、代码块等）
5. 输出简洁清晰的中文` 
  },
  { 
    role: 'user', 
    content: raw 
  }
];

export async function formatText(text: string, apiKey: string, baseUrl?: string): Promise<string> {
  const url = baseUrl || 'https://api.openai.com/v1';
  
  const { data } = await axios.post(
    `${url}/chat/completions`,
    {
      model: 'gpt-4o-mini',
      messages: FORMAT_PROMPT(text),
      temperature: 0.3,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return data.choices[0].message.content;
}

export async function formatWithCustomPrompt(
  text: string, 
  customPrompt: string, 
  apiKey: string,
  baseUrl?: string
): Promise<string> {
  const url = baseUrl || 'https://api.openai.com/v1';
  
  const messages = [
    { role: 'system', content: customPrompt },
    { role: 'user', content: text }
  ];

  const { data } = await axios.post(
    `${url}/chat/completions`,
    {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return data.choices[0].message.content;
}
