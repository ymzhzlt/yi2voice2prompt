import { writeText } from '@tauri-apps/api/clipboard';

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

export async function simulatePaste(): Promise<void> {
  // This would typically use @nut-tree/nut-js or similar library
  // For web context, we'll delegate to Tauri backend
  
  // Send Ctrl+V key combination
  const { invoke } = await import('@tauri-apps/api/tauri');
  await invoke('simulate_paste');
}

export class ClipboardManager {
  private lastCopiedText: string = '';
  
  async copy(text: string): Promise<void> {
    await copyToClipboard(text);
    this.lastCopiedText = text;
  }
  
  async paste(): Promise<void> {
    await simulatePaste();
  }
  
  async copyAndPaste(text: string): Promise<void> {
    await this.copy(text);
    // Small delay to ensure clipboard is updated
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.paste();
  }
  
  getLastCopiedText(): string {
    return this.lastCopiedText;
  }
}
