import sys
import os
import traceback

# ANTI-CRASH WINDOWS: Forțăm encodarea UTF-8 pe consolă și ignorăm caracterele care nu pot fi afișate
if sys.stdout is not None and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr is not None and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import torch
import numpy as np
import soundfile as sf
from transformers import AutoProcessor, MusicgenForConditionalGeneration

def generate_spatial_audio(prompt_text, bpm, key, output_filename, duration_seconds=8):
    # Am înlocuit emoji-urile cu texte simple de tip [INFO] ca să nu mai crape consola invizibilă din Windows!
    print("[AI Studio] Pornim motorul spatial stereo...")
    
    model_name = "facebook/musicgen-stereo-small"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    target_dtype = torch.float16 if device == "cuda" else torch.float32
    
    print(f"[Hardware] Activat: {device.upper()} | Optimizare memorie: {str(target_dtype).split('.')[1]}")

    processor = AutoProcessor.from_pretrained(model_name)
    model = MusicgenForConditionalGeneration.from_pretrained(
        model_name, 
        torch_dtype=target_dtype
    ).to(device)

    audio_engineering = (
        "wide stereo imaging, spatial acoustics, organic natural timbre, "
        "high fidelity, pristine studio mastering, atmospheric depth"
    )
    
    full_prompt = (
        f"{prompt_text}, tempo exactly {bpm} bpm, in key of {key}, "
        f"perfect musical timing, {audio_engineering}"
    )
    
    print(f"[Generare] Compunem audio pentru: {prompt_text} ({bpm} BPM | {key})...")

    max_tokens = int(duration_seconds * 50)

    inputs = processor(
        text=[full_prompt],
        padding=True,
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():
        audio_values = model.generate(
            **inputs, 
            max_new_tokens=max_tokens,
            guidance_scale=3.5
        )

    sampling_rate = model.config.audio_encoder.sampling_rate
    audio_data = audio_values[0].cpu().to(torch.float32).numpy()
    
    if audio_data.ndim == 2:
        audio_data = audio_data.T

    peak_val = np.max(np.abs(audio_data))
    if peak_val > 0:
        audio_data = (audio_data / peak_val) * 0.98

    # Creăm folderul sigur în Windows Public Music
    os.makedirs(os.path.dirname(os.path.abspath(output_filename)), exist_ok=True)

    sf.write(output_filename, audio_data, sampling_rate, subtype='FLOAT')
    print(f"[SUCCES] Sample salvat in: {output_filename}")

if __name__ == "__main__":
    try:
        if len(sys.argv) < 5:
            sys.exit("Utilizare: python generator.py <prompt> <bpm> <key> <output.wav>")

        prompt_arg = sys.argv[1]
        bpm_arg = sys.argv[2]
        key_arg = sys.argv[3]
        output_arg = sys.argv[4]

        generate_spatial_audio(prompt_arg, bpm_arg, key_arg, output_arg)
    except Exception as e:
        log_dir = "C:\\Users\\Public\\Music\\BeatslyAI"
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "ai_error_log.txt"), "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        
        # Trimitem eroarea curată către VST fără caractere speciale
        sys.exit(f"EROARE_AI: {str(e)}")