# CLAUDE.md

Este archivo guía a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Proyecto

PromptClip — app de escritorio Tauri 1.x solo para macOS para gestionar prompts de IA. Frontend React + TypeScript, backend Rust, almacenamiento SQLite. Dos superficies de UI: un Dashboard completo y un panel de búsqueda tipo Spotlight vinculado al atajo global `CMD+SHIFT+G`.

## Comandos

```bash
npm install              # instala dependencias (usa npm; también existe pnpm-lock.yaml)
npm run tauri dev        # ejecuta app completa (Rust + Vite) — comando canónico de desarrollo
npm run dev              # solo Vite, puerto 1420 (strict) — frontend sin shell Rust
npm run build            # tsc type-check, luego build de Vite → dist/
npm run tauri build      # genera bundle .app / .dmg vía Tauri
npm run lint             # eslint config airbnb, extensiones .js/.jsx/.ts/.tsx
```

No hay runner de tests configurado — actualmente no existen tests unitarios, de integración ni E2E. No inventar un script `test`; si se añaden tests, cablearlos primero en `package.json`.

Verificaciones Rust de archivo único (ejecutar dentro de `src-tauri/`):

```bash
cargo check              # verificación rápida de compilación
cargo clippy             # main.rs habilita clippy::nursery + pedantic
cargo fmt
```

## Arquitectura

### Modelo de dos ventanas (ver `src-tauri/tauri.conf.json` + `src-tauri/src/main.rs`)

Solo una ventana (`"search"`) está declarada en `tauri.conf.json`. Se reutiliza como ambas superficies:

- El lado Rust arranca con `ActivationPolicy::Accessory` (sin ícono en Dock, solo tray).
- `ns_panel.rs` convierte la NSWindow de Tauri en una subclase nativa `NSPanel` (`RawNSPanel`) para que la barra de búsqueda flote sobre apps en fullscreen y se oculte automáticamente al perder el key-window. Requiere `macOSPrivateApi: true` y bastante FFI `unsafe`/`objc` — tratar `ns_panel.rs` como código crítico y revisar docs de Apple antes de tocarlo.
- La app React (`src/App.tsx`) usa la misma ventana vía rutas: `/` renderiza `Search`, `/dashboard/*` renderiza `Dashboard`. El menú del tray y el atajo global deciden qué ruta mostrar emitiendo eventos `showApp` / `showDashboard` que el frontend escucha.
- El registro del atajo global y el posicionamiento de la ventana sobre el monitor con el cursor viven en `ns_panel::register_app_shortcut` y `position_window_at_the_center_of_the_monitor_with_cursor`.

### Organización del frontend

- `src/routes/{Search,Dashboard}` — las dos pantallas de nivel superior.
- `src/contexts/{prompts,categories,update}.context.tsx` — Context providers de React que mantienen el estado de prompts/categorías para ambas rutas. Cualquier pantalla nueva debe consumir estos contextos en vez de re-consultar SQLite directamente.
- `src/utils/database.ts` — todo el acceso a SQLite vía `tauri-plugin-sql-api` (`sqlite:prompts.db`). Esquema: `prompts` (uuid PK, category_id FK) + `categories`. `createPromptsTable()` es idempotente y se llama desde `initialiseApp()` en `src/utils/utils.ts` al montar.
- `src/utils/window.ts` — wrapper de comandos de ventana/panel de Tauri.
- Chakra UI + Framer Motion para la capa de componentes; ESLint Airbnb con varias relajaciones para React 18 (ver `.eslintrc.json`).

### Puente Frontend ↔ Rust

Comandos `invoke` registrados en `main.rs`:
- `launch_on_login` (desde `util.rs`, usa `auto-launch`)
- `init_ns_panel`, `show_app`, `hide_app` (desde `ns_panel.rs`)
- `apply_vibrancy_to_dashboard` (vibrancy HUD vía `window-vibrancy`)

El allowlist de Tauri es estrecho (`tauri.conf.json` → `tauri.allowlist`): solo scope de filesystem `$APPDATA/*`, global shortcut all, y una lista curada de operaciones de ventana. Añadir nuevas capacidades de filesystem/red implica tocar tanto `tauri.conf.json` como las features correspondientes del crate `tauri` en `src-tauri/Cargo.toml`.

## Caveats conocidos del código

- **Riesgo de SQL injection en `src/utils/database.ts`**: cada query interpola strings provistos por el usuario directamente en el SQL vía template literals (nombres de prompts, cuerpos, nombres de categorías, términos de búsqueda). Al ser una app local monousuario el radio de impacto es limitado, pero cualquier cambio en este archivo debería migrar hacia queries parametrizadas (`db.execute(sql, [params])`) en vez de añadir más concatenación de strings.
- **Init de base de datos con condición de carrera**: `db` se asigna dentro de un IIFE top-level en `database.ts`, así que el primer render puede llamar a un `db` indefinido. `initialiseApp()` serializa esto, pero los nuevos call sites deben esperar a la inicialización de la app antes de golpear la DB.
- **Solo macOS**: `window-vibrancy`, `NSPanel`, `core-graphics` y `cocoa` están bajo `cfg(target_os = "macos")`. Builds cross-platform no están soportados y los targets del bundle son `app` + `dmg`.
- **Dos lockfiles**: tanto `package-lock.json` como `pnpm-lock.yaml` están commiteados. Mantenerse con `npm` (coincide con `beforeDevCommand`) salvo migración explícita.
- **La versión del crate Rust es `0.0.0`** en `src-tauri/Cargo.toml` mientras que la versión del package Tauri es `1.0.0` en `tauri.conf.json` — esta última es la que llega a los usuarios.
