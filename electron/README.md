# Notes — Electron Wrapper (Placeholder)

This package will wrap the web app (`app/`) in an Electron shell so users can
run CubicEcho Notes as a native desktop app.

## Planned approach

- Load the exported Expo web build from `app/dist/` inside a BrowserWindow
- Use Electron's `ipcRenderer` / `ipcMain` to expose file-system APIs for reading
  and writing Markdown files from disk (replacing localStorage for the desktop target)
- Ship as a single distributable via electron-builder or electron-forge

## Status

Not yet implemented. For now, run the web app with:

```bash
npm run dev:app   # from the monorepo root
```
