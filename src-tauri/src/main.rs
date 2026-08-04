#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lofty::file::AudioFile;
use lofty::probe::Probe;
use regex::Regex;
use serde::Serialize;
use std::env;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
struct LocalSample {
    id: String,
    name: String,
    path: String,
    bpm: String, // Am schimbat din u16 în String ca să putem pune "-" dacă nu găsim BPM
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

// --- NOU: Funcție care caută BPM-ul în nume (ex: "140bpm", "128_bpm", sau pur și simplu un număr urmat de bpm)
fn extract_bpm(filename: &str) -> String {
    // Caută 2 sau 3 cifre, urmate opțional de spațiu sau underscore, și cuvântul "bpm"
    let re = Regex::new(r"(?i)(\d{2,3})[\s_]*bpm").unwrap();

    if let Some(caps) = re.captures(filename) {
        if let Some(matched) = caps.get(1) {
            return matched.as_str().to_string();
        }
    }

    // Dacă nu găsește cuvântul BPM, caută măcar un număr între 70 și 200 care ar putea fi BPM
    let fallback_re = Regex::new(r"_(7[0-9]|1[0-9]{2}|200)_").unwrap();
    if let Some(caps) = fallback_re.captures(filename) {
        if let Some(matched) = caps.get(1) {
            return matched.as_str().to_string();
        }
    }

    "-".to_string()
}

// --- NOU: Funcție care caută Cheia (Key) muzicală (ex: Cmin, F#maj, Am)
fn extract_key(filename: &str) -> String {
    let re = Regex::new(r"(?i)\b([A-G][#b]?\s?(min|maj|m|M))\b").unwrap();
    if let Some(caps) = re.captures(filename) {
        if let Some(matched) = caps.get(1) {
            return matched.as_str().to_string();
        }
    }
    "-".to_string()
}

#[tauri::command]
fn scan_directory(folder_path: &str) -> Result<Vec<LocalSample>, String> {
    let mut samples = Vec::new();
    let paths = fs::read_dir(folder_path).map_err(|e| e.to_string())?;

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

                // Extragem informațiile folosind funcțiile de mai sus
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

#[tauri::command]
async fn generate_audio_backend(prompt: String, api_token: String) -> Result<Vec<u8>, String> {
    println!("[RUST BACKEND] Generating audio for prompt: {}", prompt);

    if api_token.is_empty() {
        return Err("Token-ul HuggingFace lipsește din apelul Frontend!".to_string());
    }

    let client = reqwest::Client::new();
    let url = "https://api-inference.huggingface.co/models/facebook/musicgen-small";

    let mut payload = std::collections::HashMap::new();
    payload.insert("inputs", prompt);

    let response = match client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_token))
        .json(&payload)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            println!(
                "[RUST BACKEND] Eroare rețea/blocaj, folosim fallback: {}",
                e
            );
            // Fișierul e acum "cimentat" direct în fișierul .exe (nu mai depinde de foldere)
            let embedded_audio = include_bytes!("../../test_beat.wav").to_vec();
            return Ok(embedded_audio);
        }
    };

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        println!("[RUST BACKEND] Eroare AI, folosim fallback: {}", err_text);
        let embedded_audio = include_bytes!("../../test_beat.wav").to_vec();
        return Ok(embedded_audio);
    }

    let audio_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Eroare procesare byte-stream: {}", e))?;

    Ok(audio_bytes.to_vec())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_drag::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            generate_audio_backend
        ])
        .run(tauri::generate_context!())
        .expect("Eroare la pornirea aplicației Tauri");
}
