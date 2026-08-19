#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lofty::file::AudioFile;
use lofty::probe::Probe;
use regex::Regex;
use serde::Serialize;
use std::fs;
use std::path::Path;
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
        .invoke_handler(tauri::generate_handler![scan_directory, allow_asset_path])
        .run(tauri::generate_context!())
        .expect("Eroare la pornirea aplicației Tauri");
}
