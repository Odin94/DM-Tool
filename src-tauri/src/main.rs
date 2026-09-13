#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::{fs, net::Ipv4Addr, path::PathBuf, sync::Mutex, time::Duration};
use tauri::Manager;

struct StorageLock(Mutex<()>);

fn directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn write_file(path: PathBuf, data: &str) -> Result<(), String> {
    write_bytes(path, data.as_bytes())
}

fn write_bytes(path: PathBuf, data: &[u8]) -> Result<(), String> {
    // Keep a recoverable previous copy; never truncate the live file while writing.
    let temp = path.with_extension("tmp");
    fs::write(&temp, data).map_err(|e| e.to_string())?;
    if path.exists() {
        fs::copy(&path, path.with_extension("bak")).map_err(|e| e.to_string())?;
    }
    fs::rename(temp, path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_campaign(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = directory(&app)?.join("campaign.json");
    match fs::read_to_string(path) {
        Ok(data) => Ok(Some(data)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_database(
    app: tauri::AppHandle,
    lock: tauri::State<StorageLock>,
    data: Vec<u8>,
    notes: String,
) -> Result<(), String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    if !data.starts_with(b"SQLite format 3\0") {
        return Err("Invalid SQLite database".into());
    }
    let dir = directory(&app)?;
    write_file(dir.join("notes.md"), &notes)?;
    write_bytes(dir.join("campaign.sqlite"), &data)
}

#[tauri::command]
fn load_database(app: tauri::AppHandle) -> Result<Option<Vec<u8>>, String> {
    match fs::read(directory(&app)?.join("campaign.sqlite")) {
        Ok(data) => Ok(Some(data)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn bridge_client(ip: &str) -> Result<reqwest::Client, String> {
    let addr: Ipv4Addr = ip
        .parse()
        .map_err(|_| "Enter the bridge's local IPv4 address.")?;
    if !addr.is_private() {
        return Err("Use a bridge on your private local network.".into());
    }
    // Hue bridges use self-signed certificates. Only a validated private IPv4 host
    // and fixed Hue API paths can use this client; redirects are never followed.
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn hue_pair(app: tauri::AppHandle, ip: String) -> Result<(), String> {
    let response: Value = bridge_client(&ip)?
        .post(format!("https://{ip}/api"))
        .json(&json!({"devicetype":"hearthkeeper#desktop","generateclientkey":true}))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let key = response[0]["success"]["username"].as_str().ok_or_else(|| {
        response[0]["error"]["description"]
            .as_str()
            .unwrap_or("Pairing failed. Press the bridge link button and retry.")
            .to_string()
    })?;
    write_file(
        directory(&app)?.join("hue.json"),
        &json!({"ip":ip,"key":key}).to_string(),
    )
}

#[tauri::command]
async fn hue_scenes(app: tauri::AppHandle) -> Result<Value, String> {
    hue_request(app, None).await
}

#[tauri::command]
async fn hue_recall(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    if id.len() != 36 || !id.chars().all(|c| c.is_ascii_hexdigit() || c == '-') {
        return Err("Invalid Hue scene ID.".into());
    }
    hue_request(app, Some(id)).await
}

async fn hue_request(app: tauri::AppHandle, scene: Option<String>) -> Result<Value, String> {
    let config: Value = serde_json::from_str(
        &fs::read_to_string(directory(&app)?.join("hue.json"))
            .map_err(|_| "Pair your Hue bridge first.")?,
    )
    .map_err(|e| e.to_string())?;
    let ip = config["ip"].as_str().ok_or("Missing bridge IP")?;
    let key = config["key"].as_str().ok_or("Missing application key")?;
    let client = bridge_client(ip)?;
    let url = format!("https://{ip}/clip/v2/resource/scene");
    let request = match scene {
        Some(id) => client
            .put(format!("{url}/{id}"))
            .json(&json!({"recall":{"action":"active"}})),
        None => client.get(url),
    };
    let response: Value = request
        .header("hue-application-key", key)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    if let Some(errors) = response["errors"].as_array() {
        if !errors.is_empty() {
            return Err(serde_json::to_string(errors).map_err(|e| e.to_string())?);
        }
    }
    Ok(response["data"].clone())
}

fn main() {
    tauri::Builder::default()
        .manage(StorageLock(Mutex::new(())))
        .invoke_handler(tauri::generate_handler![
            load_campaign,
            load_database,
            save_database,
            hue_pair,
            hue_scenes,
            hue_recall
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run Hearthkeeper");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bridge_targets_are_local_ipv4_only() {
        assert!(bridge_client("192.168.1.2").is_ok());
        for target in [
            "8.8.8.8",
            "127.0.0.1",
            "bridge.example.com",
            "192.168.1.2/other",
            "::1",
        ] {
            assert!(bridge_client(target).is_err());
        }
    }

    #[test]
    fn replacement_preserves_previous_copy() {
        let dir = std::env::temp_dir().join(format!("hearthkeeper-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("campaign.json");
        write_file(path.clone(), "first").unwrap();
        write_file(path.clone(), "second").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "second");
        assert_eq!(
            fs::read_to_string(path.with_extension("bak")).unwrap(),
            "first"
        );
        fs::remove_dir_all(dir).unwrap();
    }
}
