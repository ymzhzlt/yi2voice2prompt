import { invoke } from '@tauri-apps/api/tauri';
import fs from 'fs';

/**
 * Demo recording script for CLI testing
 * Usage: pnpm ts-node scripts/demo-record.ts 5
 */

async function demoRecord(duration: number = 5) {
  console.log(`🎤 Starting ${duration} second demo recording...`);
  
  try {
    // Start recording
    await invoke('start_recording');
    console.log('📍 Recording started. Speak now!');
    
    // Wait for specified duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
    
    // Stop recording
    console.log('⏹️ Stopping recording...');
    const filePath = await invoke<string>('stop_recording');
    console.log(`💾 Recording saved to: ${filePath}`);
    
    // Check if we have API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('⚠️ No OPENAI_API_KEY found. Set it in .env file to test transcription.');
      return;
    }
    
    // Transcribe
    console.log('🔄 Transcribing audio...');
    const transcribedText = await invoke<string>('transcribe_audio', {
      filePath,
      apiKey
    });
    
    console.log('📝 Transcribed text:');
    console.log('---');
    console.log(transcribedText);
    console.log('---');
    
    // Format
    console.log('✨ Formatting text...');
    const formattedText = await invoke<string>('format_text', {
      text: transcribedText,
      apiKey
    });
    
    console.log('📋 Formatted result:');
    console.log('---');
    console.log(formattedText);
    console.log('---');
    
    // Copy to clipboard
    await invoke('copy_to_clipboard', { text: formattedText });
    console.log('✅ Text copied to clipboard! You can now paste with Ctrl+V');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Get duration from command line args
const duration = process.argv[2] ? parseInt(process.argv[2]) : 5;

if (isNaN(duration) || duration <= 0) {
  console.error('❌ Invalid duration. Usage: pnpm ts-node scripts/demo-record.ts <seconds>');
  process.exit(1);
}

demoRecord(duration);
