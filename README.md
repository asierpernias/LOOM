# LOOM -- Gestual theremin and mini-DAW

Loom transforms any webcam in a complete music controller: move your hand, change the instrument and controle the volume in real time. All the tracks can be uploaded directly to a multipist editor with real DAW tools.

## How does it work

1. The camera detects your hand with HandLandmarker of MediaPipe - 21 landmark for reference each hand.

2. At the same time the position of the wrist and the amount of fingers decide which instrument/pitch/volume is played. 

3. Tone.js synthesises the audio with reverb and delay, which you can control from the UI.

4. Each note can be recorded. Click REC, play and click STOP. The result will appear on the timeline, whit it's waveform, ready to be moved, cut, fadeded, duplicated or exported.

## UI

The app is designed as a workspace of screens (draggable, minimizable and height/width adjustable), instead of set layout. This so every user can set his own prefered layout of work.

· Camera \n
· Theremin Controls - reverb, delay, octave and the REC button <br>
· Tracks - list of tracks with solo/mute/arm/track volume <br>
· Transport - reproduction, bpm <br>
· Sequencer - create your own rythms from simple samples <br>

## Features

· Live detection of the hand <br>
· Recording peformance -> clip on Timeline with offline render <br>
· Complete timeline: move, cut, trim, duplicate, fade in/out, volume per clip, multiple selection for drag, context menu <br>
· Configurable snap (1/4, 1/8, 1/16, free) <br>
· Undo/Redo (patron command) - Ctrl Z / Ctrl Y <br>
· Export WAV / MIDI / MP3 <br>
· Save and load complete projects (.zip) <br>
· Visual indicator of recording <br>
· Mute / solo / arm for each tracklane <br>
· Available as a web and a as a desktop app (Windows, via Tauri) <br>


## Technologies 

#### Languages
· JavaScript
· HTML / CSS
· Rust (wrapper nativo de Tauri)
#### Frontend / Builder
· Vite - bundler y dev server
#### Audio
· Tone.js
· Web Audio API
#### AI
· Mediapipe Tasks Vision
· Canvas API
#### Others
· Tauri





## How to use it

### Dependencies

- [Node.js](https://nodejs.org/) 18+ y npm
- Para compilar la versión de escritorio: [Rust](https://www.rust-lang.org/tools/install) y las dependencias de sistema de Tauri ([guía oficial](https://tauri.app/start/prerequisites/))
- Una cámara web (para la detección de gestos)

### Option 1 (releases)

Download the version deployed in Github Releases and install LOOM in yout desktop

### Option 2 (web (development))

```
npm install
npm run dev
```

### Option 3 (production build)

```
npm run build
npx serve dist
```

### Option 4 (Desktop Tauri)

```
npm run tauri build
```
 
The installer is in `src-tauri/target/release/bundle/`.

## Screenshots

<img width="388" height="635" alt="Captura de pantalla 2026-06-15 165757" src="https://github.com/user-attachments/assets/c362beaa-e5cc-42d4-ab12-6bc1f09f71fa" />

<img width="1185" height="134" alt="Captura de pantalla 2026-06-29 154001" src="https://github.com/user-attachments/assets/e1a47f01-474b-486c-b729-a41afa505f7a" />

<img width="1912" height="1015" alt="Captura de pantalla 2026-07-03 135007" src="https://github.com/user-attachments/assets/b1af3bcc-e16a-4dfb-a321-8a88f6e413e3" />

## License 
MIT License

Copyright (c) 2026 Asier Pernia Soria

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

