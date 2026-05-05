fn main() {
    let mut res = tauri_build::WindowsAttributes::new();
    res = res.app_manifest(include_str!("app.manifest"));
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(res))
        .expect("failed to run tauri build");
}
