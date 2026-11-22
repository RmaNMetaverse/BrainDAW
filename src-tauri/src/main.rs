#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show BrainDAW", true, None::<&str>)?;
            let play = MenuItem::with_id(app, "toggle-play", "Play / Pause", true, None::<&str>)?;
            let mute = MenuItem::with_id(app, "toggle-mute", "Mute / Unmute", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &play, &mute, &quit])?;
            let mut tray = TrayIconBuilder::new().menu(&menu).tooltip("BrainDAW");
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.on_menu_event(|app, event| {
                match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "toggle-play" | "toggle-mute" => {
                        let _ = app.emit("studio-control", event.id.as_ref());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                }
            }).build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start BrainDAW");
}
