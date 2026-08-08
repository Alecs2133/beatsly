import { fetch } from '@tauri-apps/plugin-http';

export const generateAudio = async (prompt: string, _duration: number = 8): Promise<string> => {
  try {
    const token = import.meta.env.VITE_HF_API_TOKEN;
    
    if (!token) {
      throw new Error("Token-ul API lipsește! Te rugăm să adaugi VITE_HF_API_TOKEN în fișierul .env.local");
    }

    // Apelăm direct HuggingFace pentru modelul musicgen-melody
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/musicgen-melody",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      // HuggingFace returnează 503 când modelul "se trezește" (se încarcă în memorie pe serverele lor)
      if (response.status === 503) {
         throw new Error("Modelul AI se trezește pe serverele HuggingFace. Durează cam 20-40 de secunde. Te rugăm să mai apeși o dată pe generare!");
      }
      if (response.status === 401) {
         throw new Error("Token-ul HuggingFace este invalid.");
      }
      throw new Error(`Eroare API (${response.status}): ${errorText}`);
    }

    // HuggingFace MusicGen API returnează direct un fișier binar (audio)
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error: any) {
    console.error('Error generating audio:', error);
    throw new Error(error.message || error.toString());
  }
};
