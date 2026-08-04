import { invoke } from '@tauri-apps/api/core';

export const generateAudio = async (prompt: string, _duration: number = 8): Promise<string> => {
  try {
    // Extragem token-ul din mediul de compilare Vite
    const token = import.meta.env.VITE_HF_API_TOKEN || '';
    
    // Îl transmitem ca argument către Rust
    const audioBytes = await invoke<number[]>('generate_audio_backend', { 
      prompt,
      apiToken: token 
    });
    
    // Convertim vectorul de bytes într-un Blob și apoi într-un URL local
    const uint8Array = new Uint8Array(audioBytes);
    const blob = new Blob([uint8Array], { type: 'audio/flac' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error: any) {
    console.error('Eroare de la backend-ul Rust:', error);
    throw new Error(error.toString());
  }
};
