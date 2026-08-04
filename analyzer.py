import os
import tempfile
os.environ["NUMBA_CACHE_DIR"] = tempfile.gettempdir()

import sys
import json
import warnings
import librosa
import numpy as np

warnings.filterwarnings("ignore")

def analyze_audio(file_path):
    try:
        # Pre-detect duration to load the best segment (middle of the song is best for BPM and Key)
        total_duration = librosa.get_duration(path=file_path)
        
        offset = 0.0
        duration = 30.0
        if total_duration > 45.0:
            offset = 15.0  # Skip typical intro/silence
            duration = 30.0
        elif total_duration > 15.0:
            offset = 5.0
            duration = min(30.0, total_duration - 5.0)
        else:
            offset = 0.0
            duration = total_duration

        # sr=22050 captures high transients up to 11kHz, crucial for snare and transient beat detection
        y, sr = librosa.load(file_path, sr=22050, offset=offset, duration=duration)
        
        bpm = None
        key = None

        if duration >= 0.8:
            # HPSS separates harmonic (melody) and percussive (drum rhythm) signals
            y_harmonic, y_percussive = librosa.effects.hpss(y)

            # 1. BPM / TEMPO TRACKING (using percussive signal for clean transients)
            # Use start_bpm=120.0 to prevent octave/halving errors
            tempo, _ = librosa.beat.beat_track(y=y_percussive, sr=sr, start_bpm=120.0)
            if isinstance(tempo, np.ndarray) and tempo.size > 0:
                bpm_val = float(tempo[0])
            elif not isinstance(tempo, np.ndarray):
                bpm_val = float(tempo)
            else:
                bpm_val = 0.0

            # Double/half tempo correction (typical range is 68 - 185 BPM)
            if 0.0 < bpm_val < 68.0:
                bpm_val *= 2.0
            elif bpm_val > 185.0:
                bpm_val /= 2.0
            
            if bpm_val > 0.0:
                bpm = round(bpm_val)

            # 2. KEY DETECTION (using harmonic signal)
            # Estimate exact tuning deviation (e.g. tracks tuned to 432 Hz instead of 440 Hz)
            tuning = librosa.estimate_tuning(y=y_harmonic, sr=sr)
            
            # Chroma Constant-Q Transform (CQT) has logarithmic frequency spacing matching standard pitches
            chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr, tuning=tuning, hop_length=512)
            
            if chroma is not None:
                chroma_sum = np.sum(chroma, axis=1)
                
                if np.max(chroma_sum) > 0:
                    # Krumhansl-Schmuckler (K-S) key profiles
                    maj_ks = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
                    min_ks = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
                    
                    # Temperley key profiles (highly accurate for modern music)
                    maj_temp = np.array([5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0])
                    min_temp = np.array([5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0])
                    
                    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                    
                    best_score = -1.0
                    best_key = "-"
                    
                    for i in range(12):
                        # Roll/Shift profiles for each of the 12 chromatic pitches
                        s_maj_ks = np.roll(maj_ks, i)
                        s_min_ks = np.roll(min_ks, i)
                        s_maj_temp = np.roll(maj_temp, i)
                        s_min_temp = np.roll(min_temp, i)
                        
                        # Calculate Pearson correlation coefficient
                        c_maj_ks = np.corrcoef(chroma_sum, s_maj_ks)[0, 1]
                        c_min_ks = np.corrcoef(chroma_sum, s_min_ks)[0, 1]
                        c_maj_temp = np.corrcoef(chroma_sum, s_maj_temp)[0, 1]
                        c_min_temp = np.corrcoef(chroma_sum, s_min_temp)[0, 1]
                        
                        # Combine predictions: choose the tonality with absolute highest correlation
                        for score, key_name in [
                            (c_maj_ks, f"{notes[i]} Major"),
                            (c_min_ks, f"{notes[i]} Minor"),
                            (c_maj_temp, f"{notes[i]} Major"),
                            (c_min_temp, f"{notes[i]} Minor")
                        ]:
                            if score > best_score:
                                best_score = score
                                best_key = key_name
                                
                    key = best_key

        print(json.dumps({
            "success": True,
            "bpm": str(bpm) if bpm else "-",
            "key": key if key else "-"
        }))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_audio(sys.argv[1])
    else:
        print(json.dumps({"success": False, "error": "No file path provided"}))