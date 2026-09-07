#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lofty::file::AudioFile;
use lofty::probe::Probe;
use regex::Regex;
use serde::Serialize;
use std::fs;
use std::fs::File;
use std::path::Path;
use stratum_dsp::{analyze_audio, AnalysisConfig};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::sample::i24;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct LocalSample {
    id: String,
    name: String,
    path: String,
    bpm: String, // String, nu u16, ca să putem returna "-" când nu găsim BPM
    key: String,
    tags: Vec<String>,
    duration: String,
}

fn get_audio_duration(path: &Path) -> String {
    if let Ok(tagged_file) = Probe::open(path).and_then(|probe| probe.read()) {
        let duration = tagged_file.properties().duration();
        let total_seconds = duration.as_secs();
        let minutes = total_seconds / 60;
        let seconds = total_seconds % 60;
        return format!("{}:{:02}", minutes, seconds);
    }
    "-:--".to_string()
}

/// Caută BPM-ul în numele fișierului (ex: "140bpm", "128_bpm").
fn extract_bpm(filename: &str) -> String {
    let re = Regex::new(r"(?i)(\d{2,3})[\s_]*bpm").unwrap();

    if let Some(caps) = re.captures(filename) {
        if let Some(matched) = caps.get(1) {
            return matched.as_str().to_string();
        }
    }

    // Fără cuvântul "bpm": căutăm un număr izolat între 70 și 200.
    let fallback_re = Regex::new(r"_(7[0-9]|1[0-9]{2}|200)_").unwrap();
    if let Some(caps) = fallback_re.captures(filename) {
        if let Some(matched) = caps.get(1) {
            return matched.as_str().to_string();
        }
    }

    "-".to_string()
}

/// Caută cheia muzicală în numele fișierului (ex: Cmin, F#maj, Am).
fn extract_key(filename: &str) -> String {
    let re = Regex::new(r"(?i)\b([A-G][#b]?\s?(min|maj|m|M))\b").unwrap();
    if let Some(caps) = re.captures(filename) {
        if let Some(matched) = caps.get(1) {
            return matched.as_str().to_string();
        }
    }
    "-".to_string()
}

/// Convertește un eșantion i24 (24 de biți, stocați în i32) în f32.
fn i24_to_f32(sample: i24) -> f32 {
    sample.inner() as f32
}

/// Decodează un fișier audio (WAV/MP3/FLAC/OGG, orice acceptă `symphonia`)
/// în eșantioane mono f32 normalizate în [-1.0, 1.0], plus rata de eșantionare.
///
/// Adaptat după exemplul oficial din crate-ul `stratum-dsp`
/// (examples/analyze_file.rs) — decodarea corectă pe toate formatele de
/// eșantion (F32/F64/S16/S24/S32/U8) și mixajul la mono sunt cod ușor de
/// greșit subtil; am preferat să pornesc de la ceva deja testat de autorul
/// bibliotecii decât să-l rescriu de la zero.
fn decode_audio_file(path: &str) -> Result<(Vec<f32>, u32), String> {
    let src = File::open(path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| e.to_string())?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .ok_or_else(|| "Nu s-a găsit o pistă audio decodabilă.".to_string())?;

    let track_id = track.id;
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;

    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
    let mut all_samples = Vec::new();

    while let Ok(packet) = format.next_packet() {
        if packet.track_id() != track_id {
            continue;
        }

        match decoder.decode(&packet) {
            Ok(decoded) => {
                let spec = *decoded.spec();
                let channels = spec.channels.count();

                let samples_f32: Vec<f32> = match decoded {
                    AudioBufferRef::F32(buf) => {
                        if channels == 1 {
                            buf.chan(0).to_vec()
                        } else {
                            (0..buf.frames())
                                .map(|i| {
                                    (0..channels).map(|ch| buf.chan(ch)[i]).sum::<f32>()
                                        / channels as f32
                                })
                                .collect()
                        }
                    }
                    AudioBufferRef::F64(buf) => {
                        if channels == 1 {
                            buf.chan(0).iter().map(|&s| s as f32).collect()
                        } else {
                            (0..buf.frames())
                                .map(|i| {
                                    (0..channels).map(|ch| buf.chan(ch)[i] as f32).sum::<f32>()
                                        / channels as f32
                                })
                                .collect()
                        }
                    }
                    AudioBufferRef::S16(buf) => {
                        if channels == 1 {
                            buf.chan(0).iter().map(|&s| s as f32 / 32768.0).collect()
                        } else {
                            (0..buf.frames())
                                .map(|i| {
                                    (0..channels)
                                        .map(|ch| buf.chan(ch)[i] as f32 / 32768.0)
                                        .sum::<f32>()
                                        / channels as f32
                                })
                                .collect()
                        }
                    }
                    AudioBufferRef::S24(buf) => {
                        if channels == 1 {
                            buf.chan(0)
                                .iter()
                                .map(|&s| i24_to_f32(s) / 8388608.0)
                                .collect()
                        } else {
                            (0..buf.frames())
                                .map(|i| {
                                    (0..channels)
                                        .map(|ch| i24_to_f32(buf.chan(ch)[i]) / 8388608.0)
                                        .sum::<f32>()
                                        / channels as f32
                                })
                                .collect()
                        }
                    }
                    AudioBufferRef::S32(buf) => {
                        if channels == 1 {
                            buf.chan(0)
                                .iter()
                                .map(|&s| s as f32 / 2147483648.0)
                                .collect()
                        } else {
                            (0..buf.frames())
                                .map(|i| {
                                    (0..channels)
                                        .map(|ch| buf.chan(ch)[i] as f32 / 2147483648.0)
                                        .sum::<f32>()
                                        / channels as f32
                                })
                                .collect()
                        }
                    }
                    AudioBufferRef::U8(buf) => {
                        if channels == 1 {
                            buf.chan(0)
                                .iter()
                                .map(|&s| (s as f32 - 128.0) / 128.0)
                                .collect()
                        } else {
                            (0..buf.frames())
                                .map(|i| {
                                    (0..channels)
                                        .map(|ch| (buf.chan(ch)[i] as f32 - 128.0) / 128.0)
                                        .sum::<f32>()
                                        / channels as f32
                                })
                                .collect()
                        }
                    }
                    _ => return Err("Format de eșantion audio nesuportat.".to_string()),
                };

                all_samples.extend(samples_f32);
            }
            Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
            Err(e) => return Err(e.to_string()),
        }
    }

    Ok((all_samples, sample_rate))
}

#[derive(Serialize)]
struct AudioAnalysis {
    bpm: f32,
    key: String,
    bpm_confidence: f32,
    key_confidence: f32,
}

/// Analizează conținutul real al fișierului audio pentru BPM și tonalitate,
/// spre deosebire de `extract_bpm`/`extract_key` de mai sus, care doar
/// caută tipare în numele fișierului. E de ~10-100x mai lent (150-350ms per
/// fișier, per benchmark-urile bibliotecii `stratum-dsp`) — de-asta rulează
/// la cerere, per fișier, dintr-un buton "Analyze" în interfață, nu automat
/// la fiecare scanare de folder, unde ar transforma o listare instant
/// într-un proces de minute pentru un folder cu sute de fișiere.
#[tauri::command]
fn analyze_sample_audio(path: String) -> Result<AudioAnalysis, String> {
    let (samples, sample_rate) = decode_audio_file(&path)?;

    if samples.is_empty() {
        return Err("Fișierul nu conține date audio decodabile.".to_string());
    }

    let result = analyze_audio(&samples, sample_rate, AnalysisConfig::default())
        .map_err(|e| e.to_string())?;

    Ok(AudioAnalysis {
        bpm: result.bpm,
        key: result.key.name(),
        bpm_confidence: result.bpm_confidence,
        key_confidence: result.key_confidence,
    })
}

/// Deschide protocolul `asset:` pentru un singur fișier ales de utilizator.
///
/// Scope-ul din tauri.conf.json este gol. Anterior era `["**"]`, ceea ce
/// însemna că webview-ul putea citi orice fișier de pe disc — inclusiv chei
/// SSH, fișiere de configurare sau documente — printr-un simplu
/// `fetch('asset://...')`. Acum fiecare cale trebuie permisă explicit, iar
/// asta se întâmplă doar pentru fișierele pe care userul le-a selectat el.
#[tauri::command]
fn allow_asset_path(app: AppHandle, path: String) -> Result<(), String> {
    let p = Path::new(&path);

    if !p.exists() {
        return Err(format!("Calea nu există: {}", path));
    }

    if p.is_dir() {
        app.asset_protocol_scope()
            .allow_directory(p, false)
            .map_err(|e| e.to_string())
    } else {
        app.asset_protocol_scope()
            .allow_file(p)
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn scan_directory(app: AppHandle, folder_path: &str) -> Result<Vec<LocalSample>, String> {
    let mut samples = Vec::new();
    let paths = fs::read_dir(folder_path).map_err(|e| e.to_string())?;

    // Folderul a fost ales de utilizator prin dialog, deci îl deschidem pentru
    // protocolul `asset:` — altfel frontend-ul nu poate reda fișierele.
    // Nerecursiv: permitem exact folderul scanat, nu tot ce e sub el.
    app.asset_protocol_scope()
        .allow_directory(Path::new(folder_path), false)
        .map_err(|e| e.to_string())?;

    for (index, path_result) in paths.enumerate() {
        let entry = path_result.map_err(|e| e.to_string())?;
        let p = entry.path();

        if p.is_file() {
            let ext = p
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            if ext == "wav" || ext == "mp3" {
                let name = p.file_name().unwrap().to_string_lossy().into_owned();

                let duration = get_audio_duration(&p);
                let bpm = extract_bpm(&name);
                let key = extract_key(&name);

                samples.push(LocalSample {
                    id: index.to_string(),
                    name,
                    path: p.to_string_lossy().into_owned(),
                    bpm,
                    key,
                    tags: vec!["Local".to_string(), ext.to_uppercase()],
                    duration,
                });
            }
        }
    }
    Ok(samples)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_drag::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            allow_asset_path,
            analyze_sample_audio
        ])
        .run(tauri::generate_context!())
        .expect("Eroare la pornirea aplicației Tauri");
}
