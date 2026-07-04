# LOOM — Gestural Theremin and Mini-DAW

Loom transforms any webcam into a complete music controller: move your hand, change the instrument, and control the volume in real time. Every performance can be recorded directly into a multi-track editor with real DAW tools.

## How does it work

1. The camera detects your hand with `HandLandmarker` from MediaPipe — 21 landmarks of reference per hand.
2. The position of the wrist and the number of extended fingers determine which instrument, pitch, and volume are played.
3. Tone.js synthesizes the audio with reverb and delay, both controllable from the UI.
4. Every note can be recorded. Click REC, play, then click STOP. The result appears on the Timeline, with its waveform, ready to be moved, cut, faded, duplicated, or exported.

## UI

The app is designed as a workspace of floating windows (draggable, minimizable, and adjustable in width/height), instead of a fixed layout — so every user can set up their own preferred way of working.

- **Camera** — live feed with the hand skeleton overlay
- **Theremin Controls** — reverb, delay, octave, and the REC button
- **Tracks** — list of tracks with solo/mute/arm/volume
- **Transport** — playback, BPM
- **Sequencer** — build your own rhythms from simple samples

## Features

- Live hand detection
- Recording performance → clip on the Timeline with offline render
- Complete Timeline: move, cut, trim, duplicate, fade in/out, per-clip volume, multi-selection via drag, context menu
- Configurable snap (1/4, 1/8, 1/16, free)
- Undo/Redo (command pattern) — `Ctrl+Z` / `Ctrl+Y`
- Export to WAV / MIDI / MP3
- Save and load complete projects (`.zip`)
- Visual indicator of active recording
- Mute / solo / arm for each track
- Available as a web app and as a desktop app (Windows, via Tauri)

## Technologies

**Languages**
- JavaScript
- HTML / CSS
- Rust (Tauri's native wrapper)

**Frontend / Builder**
- Vite — bundler and dev server

**Audio**
- Tone.js
- Web Audio API

**AI**
- MediaPipe Tasks Vision
- Canvas API

**Others**
- Tauri

## How to use it

### Dependencies

- [Node.js](https://nodejs.org/) 18+ and npm
- To build the desktop version: [Rust](https://www.rust-lang.org/tools/install) and Tauri's system dependencies ([official guide](https://tauri.app/start/prerequisites/))
- A webcam (for gesture detection)

### Option 1 — Releases

Download the version published in GitHub Releases and install LOOM on your desktop.

### Option 2 — Web (development)

```bash
npm install
npm run dev
```

### Option 3 — Production build

```bash
npm run build
npx serve dist
```

### Option 4 — Desktop (Tauri)

```bash
npm run tauri build
```

The installer will be located in `src-tauri/target/release/bundle/`.

> **Note**: on Windows, the installer isn't digitally signed. It's normal for the "Windows protected your PC" warning to appear — click **More info → Run anyway** to continue.

## Screenshots

*(coming soon)*

## License

MIT License

Copyright (c) 2026 Asier Pernia Soria

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Screenshots

<img width="388" height="635" alt="Captura de pantalla 2026-06-15 165757" src="https://github.com/user-attachments/assets/c362beaa-e5cc-42d4-ab12-6bc1f09f71fa" />

<img width="1185" height="134" alt="Captura de pantalla 2026-06-29 154001" src="https://github.com/user-attachments/assets/e1a47f01-474b-486c-b729-a41afa505f7a" />

<img width="1912" height="1015" alt="Captura de pantalla 2026-07-03 135007" src="https://github.com/user-attachments/assets/b1af3bcc-e16a-4dfb-a321-8a88f6e413e3" />
