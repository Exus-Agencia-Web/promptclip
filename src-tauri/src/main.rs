#![warn(clippy::nursery, clippy::pedantic)]

mod ns_panel;
mod util;

use std::sync::Mutex;

use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem, Window,
};

static APP_HANDLE: Mutex<Option<AppHandle>> = Mutex::new(None);

#[allow(unused_imports)]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

use util::launch_on_login;

fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("Quit".to_string(), "Quit");
    let show = CustomMenuItem::new("Show".to_string(), "Show");
    let hide = CustomMenuItem::new("Hide".to_string(), "Hide");
    let dashboard = CustomMenuItem::new("Dashboard".to_string(), "Dashboard");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_item(dashboard)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    SystemTray::new().with_menu(tray_menu)
}

#[tauri::command]
fn set_tray_labels(
    app: AppHandle,
    show: String,
    hide: String,
    dashboard: String,
    quit: String,
) -> Result<(), String> {
    let tray = app.tray_handle();
    tray.get_item("Show")
        .set_title(show)
        .map_err(|e| e.to_string())?;
    tray.get_item("Hide")
        .set_title(hide)
        .map_err(|e| e.to_string())?;
    tray.get_item("Dashboard")
        .set_title(dashboard)
        .map_err(|e| e.to_string())?;
    tray.get_item("Quit")
        .set_title(quit)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn apply_vibrancy_to_dashboard(window: Window) {
    // let window = app.get_window("main").unwrap();
    apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(10.0))
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
}

/// Toggle the app activation policy so the dashboard is a real window
/// (Dock icon + CMD+Tab) when visible, and hidden from both when closed.
#[tauri::command]
fn set_dashboard_visible(_app: AppHandle, visible: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSApp, NSApplicationActivationPolicy};
        use objc::{msg_send, sel, sel_impl};

        let policy = if visible {
            NSApplicationActivationPolicy::NSApplicationActivationPolicyRegular
        } else {
            NSApplicationActivationPolicy::NSApplicationActivationPolicyAccessory
        } as i64;

        unsafe {
            let ns_app = NSApp();
            let _: () = msg_send![ns_app, setActivationPolicy: policy];
            if visible {
                let _: () = msg_send![ns_app, activateIgnoringOtherApps: true];
            }
        }
    }
    Ok(())
}

/// Register an NSNotificationCenter observer for
/// NSApplicationDidBecomeActiveNotification so that clicking the Dock icon
/// (which re-activates the app) routes through JS as a `reopenFromDock` event.
#[cfg(target_os = "macos")]
fn register_reopen_observer() {
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;
    use objc::declare::ClassDecl;
    use objc::runtime::{Class, Object, Sel};
    use objc::{class, msg_send, sel, sel_impl};

    extern "C" fn on_become_active(_: &Object, _: Sel, _: id) {
        if let Ok(guard) = APP_HANDLE.lock() {
            if let Some(handle) = guard.as_ref() {
                if let Some(search) = handle.get_window("search") {
                    let _ = search.emit("reopenFromDock", ());
                }
            }
        }
    }

    let cls_name = "PromptClipReopenObserver";
    let cls = Class::get(cls_name).unwrap_or_else(|| {
        let mut decl = ClassDecl::new(cls_name, class!(NSObject))
            .expect("failed to declare reopen observer class");
        unsafe {
            decl.add_method(
                sel!(onBecomeActive:),
                on_become_active as extern "C" fn(&Object, Sel, id),
            );
        }
        decl.register()
    });

    unsafe {
        let observer: id = msg_send![cls, new];
        let center: id = msg_send![class!(NSNotificationCenter), defaultCenter];
        let name = NSString::alloc(nil).init_str("NSApplicationDidBecomeActiveNotification");
        let _: () = msg_send![
            center,
            addObserver: observer
            selector: sel!(onBecomeActive:)
            name: name
            object: nil
        ];
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            launch_on_login,
            ns_panel::init_ns_panel,
            ns_panel::show_app,
            ns_panel::hide_app,
            apply_vibrancy_to_dashboard,
            set_tray_labels,
            set_dashboard_visible
        ])
        .setup(|app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = app.get_window("search").unwrap();
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(10.0))
                .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

            if let Ok(mut guard) = APP_HANDLE.lock() {
                *guard = Some(app.handle());
            }
            #[cfg(target_os = "macos")]
            register_reopen_observer();

            Ok(())
        })
        .manage(ns_panel::State::default())
        .system_tray(create_system_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "Hide" => {
                    let window = app.get_window("search").unwrap();
                    window.hide().unwrap();
                }
                "Show" => {
                    let window = app.get_window("search").unwrap();
                    window.emit("showApp", Some("Yes")).unwrap();
                    window.show().unwrap();
                    window.center().unwrap();
                }
                "Dashboard" => {
                    // Route through JS so it can flip the activation policy
                    // to Regular (Dock icon + CMD+Tab) before showing.
                    if let Some(search) = app.get_window("search") {
                        let _ = search.emit("showDashboard", ());
                    }
                }
                "Quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
