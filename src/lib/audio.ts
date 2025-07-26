import axios from 'axios';

export async function transcribeAudio(filePath: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  
  // Read file as blob
  const response = await fetch(`file://${filePath}`);
  const audioBlob = await response.blob();
  
  formData.append('model', 'whisper-1');
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('language', 'zh');
  formData.append('response_format', 'json');

  const { data } = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    { 
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data'
      } 
    }
  );
  
  return data.text as string;
}
