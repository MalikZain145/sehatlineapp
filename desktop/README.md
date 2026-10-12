# SehatLine — Desktop (Windows)

A desktop build of the SehatLine app. It is an **Electron** shell around the
Expo **web** build, shown in a phone-sized window so the layout matches the app.
It talks to the **same backend** as the mobile app.

## Build the Windows app (.exe)

```bash
# 1) Build the web bundle from the app (run once, and after any app change)
cd ../frontend
npx expo export -p web --output-dir dist

# 2) Build the desktop app
cd ../desktop
npm install          # first time only (downloads Electron)
npm run dist         # builds installer + portable .exe
```

Output lands in **`desktop/dist-build/`**:

- `SehatLine Setup <version>.exe` — installer (creates a desktop shortcut)
- `SehatLine-Portable.exe` — single-file portable app (no install needed)

## Run in development (no packaging)

```bash
cd desktop
npm run sync-web     # copy the latest frontend/dist into ./web
npm start            # opens the app in an Electron window
```

## Notes

- The window is 440×900 (resizable) to mirror the phone layout.
- Camera-based CNIC capture and fingerprint login are mobile-only; the rest of
  the app (admin, doctor, pharmacy, laboratory, patient flows) works on desktop.
- The app uses the hosted backend (`USE_PRODUCTION = true` in
  `frontend/src/config/api.config.js`). If that backend is down, the desktop app
  shows connection errors too — it is the same API.
